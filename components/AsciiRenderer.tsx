"use client";

/**
 * AsciiRenderer
 *
 * A WebGL-based ASCII portrait effect inspired by swaylab.ai's Mirror_S
 * landing avatar. Samples a source texture (video or image) per-cell,
 * computes luminance, and blends a glyph atlas (a ramp of ASCII chars)
 * so that denser glyphs fill darker regions. A low-frequency sine wave
 * modulates the cell size each frame to create a breathing / dithering
 * animation.
 *
 * Source texture resolution order (first one that loads wins):
 *   /avatar.mp4  (preferred — animated portrait)
 *   /avatar.jpg  (fallback — still image)
 *   generated placeholder silhouette (always works, no asset required)
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const CHARSET =
  " .'`,:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

// Visual tuning; values chosen to read well on a white page.
//
// `invert` flips the brightness→glyph-density mapping:
//   - false (default): dark pixels → dense glyphs (@, #).
//                      Use for photos with LIGHT backgrounds + DARK subject.
//   - true:            bright pixels → dense glyphs.
//                      Use for photos with DARK backgrounds + LIGHT subject,
//                      or when the output looks "reversed" (white hair,
//                      black face, etc.).
const PARAMS = {
  cellSize: 1.6,
  charAspect: 1.18,
  glyphScaleX: 0.7,
  glyphScaleY: 0.8,
  inkStrength: 2.0,
  glyphGamma: 1.0,
  featureBoost: 0.04,
  // Widened thresholds so ordinary photos (not just pure white backgrounds)
  // render without crushing either extreme.
  blackThreshold: 0.1,
  blackSoftness: 0.2,
  whiteThreshold: 0.75,
  whiteSoftness: 0.15,
  contrast: 3.2,
  alpha: 1.0,
  invert: false,
};

/** Render the glyph atlas: one tall strip of bold monochrome characters. */
function buildGlyphAtlas(charset: string): {
  texture: THREE.CanvasTexture;
  glyphCount: number;
} {
  const cellW = 64;
  const cellH = 96;
  const canvas = document.createElement("canvas");
  canvas.width = cellW * charset.length;
  canvas.height = cellH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("glyph atlas: 2d context unavailable");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 86px Menlo, Monaco, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < charset.length; i++) {
    ctx.fillText(charset[i], cellW * i + cellW / 2, cellH * 0.56);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return { texture: tex, glyphCount: charset.length };
}

/** Procedural placeholder: a softly-lit human head silhouette on white.
 *  Used when no /avatar.mp4 or /avatar.jpg is available. */
function buildPlaceholderTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // White background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Upper body blob (shoulders + neck) with a radial gradient for soft shading.
  const shoulders = ctx.createRadialGradient(W / 2, H * 1.0, 20, W / 2, H * 1.0, H * 0.9);
  shoulders.addColorStop(0, "#2a2a2a");
  shoulders.addColorStop(0.5, "#4a4a4a");
  shoulders.addColorStop(1, "#d8d8d8");
  ctx.fillStyle = shoulders;
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 1.05, W * 0.55, H * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Neck.
  ctx.fillStyle = "#3a3a3a";
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.72, W * 0.09, H * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head (ellipsoid) with gradient for volume.
  const head = ctx.createRadialGradient(
    W * 0.44,
    H * 0.38,
    20,
    W / 2,
    H * 0.45,
    W * 0.38,
  );
  head.addColorStop(0, "#8a8a8a");
  head.addColorStop(0.5, "#555555");
  head.addColorStop(1, "#1e1e1e");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.44, W * 0.26, H * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair cap.
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.29, W * 0.27, H * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye sockets — darker patches to give the shader something to dither.
  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.ellipse(W * 0.42, H * 0.46, W * 0.04, H * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(W * 0.58, H * 0.46, W * 0.04, H * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle highlight on the left cheek.
  const cheek = ctx.createRadialGradient(
    W * 0.38,
    H * 0.55,
    5,
    W * 0.38,
    H * 0.55,
    W * 0.15,
  );
  cheek.addColorStop(0, "rgba(255,255,255,0.15)");
  cheek.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = cheek;
  ctx.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform sampler2D uTexture;
  uniform sampler2D uGlyphTexture;
  uniform float uGlyphCount;
  uniform float uPixelRatio;
  uniform float uCellSize;
  uniform float uCharAspect;
  uniform vec2 uGlyphScale;
  uniform float uInkStrength;
  uniform float uGlyphGamma;
  uniform float uFeatureBoost;
  uniform float uBlackThreshold;
  uniform float uBlackSoftness;
  uniform float uWhiteThreshold;
  uniform float uWhiteSoftness;
  uniform float uContrast;
  uniform float uAlpha;
  uniform float uInvert;
  uniform vec3 uBackgroundColor;
  uniform vec3 uForegroundColor;

  varying vec2 vUv;

  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  float sampleLuma(vec2 uv) {
    return luma(texture2D(uTexture, clamp(uv, vec2(0.0), vec2(1.0))).rgb);
  }

  float sampleGlyph(vec2 p, float idx) {
    vec2 glyphUv = vec2((idx + p.x) / uGlyphCount, p.y);
    float glyph = texture2D(uGlyphTexture, glyphUv).a;
    glyph = smoothstep(0.05, 0.78, glyph);
    glyph = pow(glyph, uGlyphGamma);
    return min(1.0, glyph * uInkStrength);
  }

  void main() {
    vec2 cellSizePx = vec2(
      max(1.0, uCellSize * max(uPixelRatio, 1.0)),
      max(1.0, uCellSize * uCharAspect * max(uPixelRatio, 1.0))
    );
    vec2 cellId = floor(gl_FragCoord.xy / cellSizePx);
    vec2 localUv = fract(gl_FragCoord.xy / cellSizePx);
    localUv.y = 1.0 - localUv.y;
    vec2 glyphUv = (localUv - 0.5) * uGlyphScale + 0.5;
    glyphUv = clamp(glyphUv, vec2(0.0), vec2(1.0));

    vec2 cellCenterFrag = (cellId + 0.5) * cellSizePx;
    vec2 deltaPx = cellCenterFrag - gl_FragCoord.xy;

    vec2 cellUv = vUv
      + dFdx(vUv) * deltaPx.x
      + dFdy(vUv) * deltaPx.y;
    cellUv = clamp(cellUv, vec2(0.0), vec2(1.0));

    vec4 tex = texture2D(uTexture, cellUv);
    vec3 color = tex.rgb;

    float darkScore = max(max(color.r, color.g), color.b);
    float whiteScore = min(min(color.r, color.g), color.b);

    // Mask of "this pixel is not paper-white background" — used to fade
    // the edges of the subject so background doesn't render as ink.
    float lightMask = 1.0 - smoothstep(
      uWhiteThreshold,
      uWhiteThreshold + uWhiteSoftness,
      whiteScore
    );
    float shadowCutMask = smoothstep(
      uBlackThreshold,
      uBlackThreshold + uBlackSoftness,
      darkScore
    );
    // Foreground presence mask. In normal mode subject is darker than paper.
    // In invert mode subject is brighter than the (dark) background, so we
    // use the inverse cut: region is foreground when the pixel is bright
    // relative to the black threshold of the background.
    float fgMask = mix(
      lightMask * shadowCutMask,
      shadowCutMask,
      uInvert
    );

    color = (color - 0.5) * uContrast + 0.5;
    color = clamp(color, 0.0, 1.0);

    vec2 sampleStep = max(
      abs(dFdx(cellUv)) + abs(dFdy(cellUv)),
      vec2(0.0005)
    );
    float brightness = luma(color);
    float leftLuma = sampleLuma(cellUv - vec2(sampleStep.x, 0.0));
    float rightLuma = sampleLuma(cellUv + vec2(sampleStep.x, 0.0));
    float upLuma = sampleLuma(cellUv + vec2(0.0, sampleStep.y));
    float downLuma = sampleLuma(cellUv - vec2(0.0, sampleStep.y));
    float localContrast = (
      abs(brightness - leftLuma)
      + abs(brightness - rightLuma)
      + abs(brightness - upLuma)
      + abs(brightness - downLuma)
    ) * 0.25;
    float edgeStrength = abs(leftLuma - rightLuma) + abs(upLuma - downLuma);
    float featureMask = clamp(
      max(localContrast * 1.8, edgeStrength * 0.75) * uFeatureBoost,
      0.0,
      1.0
    );

    brightness = clamp(brightness - featureMask * 0.45, 0.0, 1.0);
    // Density lookup. Normal mode: dark pixel → dense glyph (@, #).
    // Invert mode: bright pixel → dense glyph.
    float density = mix(1.0 - brightness, brightness, uInvert);
    float idx = floor(density * (uGlyphCount - 1.0) + 0.5);
    float glyph = sampleGlyph(glyphUv, idx);
    float inkMask = min(1.0, glyph * (fgMask + featureMask * 0.3));
    float glyphAlpha = pow(inkMask, 0.82);
    float inkTone = smoothstep(0.06, 0.72, inkMask);
    inkTone = min(1.0, pow(inkTone, 0.68) * 1.08);
    // In invert mode the "surface" is the bright subject, so use fgMask
    // rather than shadowCutMask to drive the surface alpha.
    float surfaceAlpha = mix(shadowCutMask, fgMask, uInvert);
    float finalAlpha = max(glyphAlpha, surfaceAlpha) * uAlpha;
    vec3 finalColor = mix(uBackgroundColor, uForegroundColor, inkTone);
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

/** Image source candidates checked in order. First one that successfully
 *  decodes as an <img> wins. Drop any of these into `public/` to use. */
const IMAGE_CANDIDATES = [
  "/avatar.jpg",
  "/avatar.jpeg",
  "/avatar.png",
  "/avatar.webp",
];

/** Video source candidates checked in order. */
const VIDEO_CANDIDATES = ["/avatar.mp4", "/avatar.webm"];

/** Try decoding an image URL. Resolves with the decoded HTMLImageElement
 *  on success, or null on 404 / decode error. Uses an actual <img> so it
 *  works even on static hosts that don't support HEAD. */
function probeImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Probe a video source by attempting to load metadata. */
function probeVideo(
  videoEl: HTMLVideoElement,
  url: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const onLoaded = () => {
      videoEl.removeEventListener("loadeddata", onLoaded);
      videoEl.removeEventListener("error", onError);
      resolve(true);
    };
    const onError = () => {
      videoEl.removeEventListener("loadeddata", onLoaded);
      videoEl.removeEventListener("error", onError);
      resolve(false);
    };
    videoEl.addEventListener("loadeddata", onLoaded, { once: true });
    videoEl.addEventListener("error", onError, { once: true });
    videoEl.src = url;
    videoEl.load();
  });
}

interface Props {
  /** height of the renderer as a fraction of viewport height (default 0.38) */
  heightVh?: number;
  /**
   * Flip brightness→glyph-density mapping. Set true when your photo has a
   * dark background with a lighter subject, OR whenever the output looks
   * "reversed" (e.g. white hair / black face). Default false (works for
   * typical white-background portraits).
   */
  invert?: boolean;
}

export default function AsciiRenderer({
  heightVh = 0.38,
  invert = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let rafId = 0;
    // Cleanup tasks accumulated as async setup progresses. Because the
    // outer effect returns synchronously (it can't await the async IIFE),
    // we register teardown steps here and run them on unmount.
    const cleanupTasks: Array<() => void> = [];

    // Decide the source texture.
    (async () => {
      let sourceTexture: THREE.Texture;
      let videoEl: HTMLVideoElement | null = null;
      let videoSize = { w: 512, h: 512 };

      // 1) Try any video candidate first (animated — richest effect).
      let videoLoaded = false;
      if (videoRef.current) {
        const v = videoRef.current;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.crossOrigin = "anonymous";
        for (const url of VIDEO_CANDIDATES) {
          if (await probeVideo(v, url)) {
            videoEl = v;
            videoSize = {
              w: v.videoWidth || 512,
              h: v.videoHeight || 512,
            };
            videoLoaded = true;
            break;
          }
        }
      }

      if (videoLoaded && videoEl) {
        try {
          await videoEl.play();
        } catch {
          /* autoplay blocked — will resume on first user interaction */
        }
        const vt = new THREE.VideoTexture(videoEl);
        // Use NoColorSpace so the shader samples raw pixel values. Applying
        // sRGB decoding here would distort the luma-based contrast math,
        // often producing "inverted" looking output (dark face / light hair).
        vt.colorSpace = THREE.NoColorSpace;
        vt.minFilter = THREE.LinearFilter;
        vt.magFilter = THREE.LinearFilter;
        sourceTexture = vt;
      } else {
        // 2) Try each image candidate in order.
        let imageTexture: THREE.Texture | null = null;
        for (const url of IMAGE_CANDIDATES) {
          const img = await probeImage(url);
          if (img) {
            const tex = new THREE.Texture(img);
            // See note above re: NoColorSpace for correct luma mapping.
            tex.colorSpace = THREE.NoColorSpace;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.needsUpdate = true;
            videoSize = { w: img.width, h: img.height };
            imageTexture = tex;
            break;
          }
        }

        if (imageTexture) {
          sourceTexture = imageTexture;
        } else {
          // 3) Fall back to the procedural placeholder silhouette.
          sourceTexture = buildPlaceholderTexture();
        }
      }

      if (disposed) {
        sourceTexture.dispose();
        return;
      }

      // Init Three.js renderer.
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: false,
          premultipliedAlpha: false,
        });
      } catch {
        sourceTexture.dispose();
        setFallback(true);
        return;
      }
      if (!renderer.getContext()) {
        renderer.dispose();
        sourceTexture.dispose();
        setFallback(true);
        return;
      }

      const width = window.innerWidth;
      const height = Math.floor(heightVh * window.innerHeight);
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
      camera.position.z = 1;

      const atlas = buildGlyphAtlas(CHARSET);

      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTexture: { value: sourceTexture },
          uGlyphTexture: { value: atlas.texture },
          uGlyphCount: { value: atlas.glyphCount },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uCellSize: { value: PARAMS.cellSize },
          uCharAspect: { value: PARAMS.charAspect },
          uGlyphScale: {
            value: new THREE.Vector2(PARAMS.glyphScaleX, PARAMS.glyphScaleY),
          },
          uInkStrength: { value: PARAMS.inkStrength },
          uGlyphGamma: { value: PARAMS.glyphGamma },
          uFeatureBoost: { value: PARAMS.featureBoost },
          uBlackThreshold: { value: PARAMS.blackThreshold },
          uBlackSoftness: { value: PARAMS.blackSoftness },
          uWhiteThreshold: { value: PARAMS.whiteThreshold },
          uWhiteSoftness: { value: PARAMS.whiteSoftness },
          uContrast: { value: PARAMS.contrast },
          uAlpha: { value: PARAMS.alpha },
          uInvert: { value: invert ? 1 : 0 },
          uForegroundColor: { value: new THREE.Color("#000000") },
          uBackgroundColor: { value: new THREE.Color("#ffffff") },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
      });

      const geometry = new THREE.PlaneGeometry(1, 1);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const fitMesh = () => {
        const w = window.innerWidth;
        const h = Math.floor(heightVh * window.innerHeight);
        const viewAspect = w / h;
        const imgAspect = videoSize.w / Math.max(1, videoSize.h);
        if (imgAspect > viewAspect) {
          mesh.scale.set(1, viewAspect / imgAspect, 1);
        } else {
          mesh.scale.set(imgAspect / viewAspect, 1, 1);
        }
      };
      fitMesh();

      const onResize = () => {
        if (!renderer) return;
        const w = window.innerWidth;
        const h = Math.floor(heightVh * window.innerHeight);
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        material.uniforms.uPixelRatio.value = Math.min(
          window.devicePixelRatio,
          2,
        );
        fitMesh();
      };
      window.addEventListener("resize", onResize);

      // Animation: low-frequency sine-based cell-size drift.
      let frame = 0;
      let smoothedDrift = 0;
      const animate = () => {
        if (disposed) return;
        rafId = requestAnimationFrame(animate);
        frame++;
        const slow = (Math.sin(0.013 * frame + 0.5) + 1) * 0.2;
        const slower = (Math.sin(0.0071 * frame + 2.1) + 1) * 0.1;
        const pulse = Math.max(
          0,
          Math.sin(0.003 * frame + 2.7) * Math.sin(0.0015 * frame),
        );
        const flicker =
          (Math.sin(0.073 * frame + 3.1 * Math.sin(0.019 * frame)) + 1) * 0.5;
        const target = slow + slower + pulse * pulse * flicker * 14;
        smoothedDrift += (target - smoothedDrift) * 0.22;
        material.uniforms.uCellSize.value = PARAMS.cellSize + smoothedDrift;
        renderer.render(scene, camera);
      };
      animate();

      // Resume autoplay on first user interaction (mobile/Safari).
      const resume = () => {
        if (videoEl) {
          videoEl.play().catch(() => {});
        }
      };
      document.addEventListener("click", resume, { once: true });
      document.addEventListener("touchstart", resume, {
        once: true,
        passive: true,
      });

      // Register teardown steps for the outer effect's cleanup.
      cleanupTasks.push(() => {
        window.removeEventListener("resize", onResize);
        document.removeEventListener("click", resume);
        document.removeEventListener("touchstart", resume);
        geometry.dispose();
        material.dispose();
        atlas.texture.dispose();
        sourceTexture.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      });

      // If the component unmounted while we were still setting up,
      // run the cleanup immediately.
      if (disposed) {
        cleanupTasks.forEach((fn) => {
          try {
            fn();
          } catch {
            /* ignore */
          }
        });
        cleanupTasks.length = 0;
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      cleanupTasks.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
      cleanupTasks.length = 0;
    };
  }, [heightVh, invert]);

  if (fallback) {
    return (
      <div
        className="w-full flex items-center justify-center font-mono select-none pointer-events-none"
        style={{
          height: `${heightVh * 100}vh`,
          color: "rgba(0,0,0,0.1)",
          fontSize: 10,
          letterSpacing: 6,
        }}
      >
        SWAY_LAB
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="w-screen pointer-events-none"
        style={{ height: `${heightVh * 100}vh` }}
        aria-hidden
      />
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="auto"
        crossOrigin="anonymous"
        style={{
          position: "fixed",
          top: -1,
          left: -1,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
    </>
  );
}

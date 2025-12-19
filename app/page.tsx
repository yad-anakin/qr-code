'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export default function HomePage() {
  const [value, setValue] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState(20);
  const [logoFrame, setLogoFrame] = useState(true);
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [useTransparentBg, setUseTransparentBg] = useState(false);
  const [preset, setPreset] = useState<'classic' | 'soft' | 'contrast' | 'flag'>('classic');
  const [shape, setShape] = useState<'square' | 'rounded' | 'dots' | 'pill' | 'diamond'>('square');
  const [eyeShape, setEyeShape] = useState<'square' | 'rounded' | 'circle' | 'diamond'>('square');
  const [eyeColor, setEyeColor] = useState<string | null>(null);
  const [gradientMode, setGradientMode] = useState<'solid' | 'linear' | 'radial'>('solid');
  const [fgColor2, setFgColor2] = useState('#000000');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTheme = (next: 'light' | 'dark') => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    if (next === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('theme', next);
    setTheme(next);
  };

  const applyPreset = (nextPreset: 'classic' | 'soft' | 'contrast' | 'flag') => {
    setPreset(nextPreset);
    setUseTransparentBg(false);

    // apply grouped style presets
    if (nextPreset === 'classic') {
      setFgColor('#000000');
      setFgColor2('#000000');
      setBgColor('#ffffff');
      setShape('square');
      setEyeShape('square');
      // Corners follow dots by default for classic
      setEyeColor(null);
      setGradientMode('solid');
      return;
    }

    if (nextPreset === 'soft') {
      const softFg = theme === 'dark' ? '#e5e7eb' : '#1e293b';
      const softBg = theme === 'dark' ? '#020617' : '#f4f4f5';
      setFgColor(softFg);
      setFgColor2(softFg);
      setBgColor(softBg);
      setShape('rounded');
      setEyeShape('rounded');
      // Corners follow dots by default for soft
      setEyeColor(null);
      setGradientMode('solid');
      return;
    }

    if (nextPreset === 'contrast') {
      // "Neon" / high contrast preset
      const neonFg = '#22c55e';
      const neonFg2 = '#16a34a';
      const neonBg = theme === 'dark' ? '#020617' : '#0f172a';
      setFgColor(neonFg);
      setFgColor2(neonFg2);
      setBgColor(neonBg);
      setShape('dots');
      setEyeShape('square');
      setEyeColor('#ffffff');
      setGradientMode('linear');
      return;
    }

    if (nextPreset === 'flag') {
      // Flag-inspired preset: red/white/green stripes in dots, white background, auto-colored corners
      const flagRed = '#ED1C24';
      const flagGreen = '#00923F';
      const flagWhite = '#FFFFFF';

      setFgColor(flagRed);
      setFgColor2(flagGreen);
      setBgColor(flagWhite);
      setShape('square');
      setEyeShape('square');
      // Corners will auto-color (top red, bottom green) when eyeColor is null
      setEyeColor(null);
      setGradientMode('linear');
    }
  };

  const handleGenerate = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (lastGeneratedAt && now - lastGeneratedAt < 5000) {
      setRateLimitMessage('Please wait a few seconds before generating another QR code.');
      return;
    }

    setRateLimitMessage(null);

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    try {
      const defaultFg = theme === 'dark' ? '#ffffff' : '#000000';
      const defaultBg = theme === 'dark' ? '#020617' : '#ffffff';
      const darkColor = fgColor || defaultFg;
      const darkColor2 = fgColor2 || darkColor;
      const lightColor = useTransparentBg ? '#00000000' : bgColor || defaultBg;

      const size = 512;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, size, size);

      if (!useTransparentBg) {
        ctx.fillStyle = lightColor;
        ctx.fillRect(0, 0, size, size);
      }

      const qr = QRCode.create(trimmed, { errorCorrectionLevel: 'H' }) as any;
      const modules = qr.modules;
      const count: number = modules.size;
      const marginCells = 2;
      const cellSize = size / (count + marginCells * 2);

      // prepare gradient for dots (not used for eyes)
      let dotGradient: CanvasGradient | null = null;
      if (gradientMode === 'linear') {
        dotGradient = ctx.createLinearGradient(0, 0, 0, size);

        if (preset === 'flag') {
          // Flag-style stripes: top red, white band in the middle, strong green at the bottom
          dotGradient.addColorStop(0, '#ED1C24');      // red start
          dotGradient.addColorStop(0.36, '#ED1C24');   // red end

          dotGradient.addColorStop(0.36, '#FFFFFF');  // white start
          dotGradient.addColorStop(0.64, '#FFFFFF');  // white end

          dotGradient.addColorStop(0.64, '#00923F');  // green start
          dotGradient.addColorStop(1, '#00923F');     // green end
        } else {
          dotGradient.addColorStop(0, darkColor);
          dotGradient.addColorStop(1, darkColor2);
        }
      } else if (gradientMode === 'radial') {
        dotGradient = ctx.createRadialGradient(
          size / 2,
          size / 2,
          0,
          size / 2,
          size / 2,
          size / 2
        );
        dotGradient.addColorStop(0, darkColor);
        dotGradient.addColorStop(1, darkColor2);
      }

      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (!modules.get(row, col)) continue;

          const x = (col + marginCells) * cellSize;
          const y = (row + marginCells) * cellSize;

          const inTopLeftEye = row < 7 && col < 7;
          const inTopRightEye = row < 7 && col >= count - 7;
          const inBottomLeftEye = row >= count - 7 && col < 7;
          const isEye = inTopLeftEye || inTopRightEye || inBottomLeftEye;

          const moduleShape = isEye ? eyeShape : shape;
          let moduleColor: string;
          if (isEye) {
            // For the flag preset with default corner color, make top eyes red and bottom eye green.
            if (preset === 'flag' && eyeColor === null) {
              if (inBottomLeftEye) {
                moduleColor = '#00923F'; // green
              } else {
                moduleColor = '#ED1C24'; // red (top two corners)
              }
            } else {
              moduleColor = eyeColor ?? darkColor;
            }
          } else {
            moduleColor = darkColor;
          }

          if (isEye) {
            ctx.fillStyle = moduleColor;
          } else {
            ctx.fillStyle = dotGradient || darkColor;
          }

          if (moduleShape === 'square') {
            ctx.fillRect(x, y, cellSize, cellSize);
          } else if (moduleShape === 'rounded' || moduleShape === 'pill') {
            const r = moduleShape === 'pill' ? cellSize * 0.6 : cellSize * 0.4;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + cellSize - r, y);
            ctx.quadraticCurveTo(x + cellSize, y, x + cellSize, y + r);
            ctx.lineTo(x + cellSize, y + cellSize - r);
            ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - r, y + cellSize);
            ctx.lineTo(x + r, y + cellSize);
            ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
          } else if (moduleShape === 'diamond') {
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            const r = (cellSize / 2) * 0.9;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r, cy);
            ctx.closePath();
            ctx.fill();
          } else if (moduleShape === 'circle') {
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            const radius = (cellSize / 2) * 0.9;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // dots
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            const radius = (cellSize / 2) * 0.8;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // For the flag preset, draw the central emblem image if no custom logo is used
      if (preset === 'flag' && !logoSrc) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve();
                return;
              }

              const size = Math.min(canvas.width, canvas.height);
              const emblemSize = size * 0.3; // smaller than the logo frame
              const x = (canvas.width - emblemSize) / 2;
              const y = (canvas.height - emblemSize) / 2;

              ctx.save();
              ctx.globalAlpha = 1;
              ctx.drawImage(img, x, y, emblemSize, emblemSize);
              ctx.restore();
            } catch (err) {
              console.error('Failed to draw flag emblem on QR code', err);
            }
            resolve();
          };
          img.onerror = () => {
            console.error('Failed to load flag emblem image from /image.png');
            resolve();
          };
          img.src = '/image.png';
        });
      }

      if (logoSrc) {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            try {
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve();
                return;
              }
              const size = Math.min(canvas.width, canvas.height);
              const safeLogoScale = Math.min(logoScale, 22);
              const logoSize = size * (safeLogoScale / 100);
              const x = (canvas.width - logoSize) / 2;
              const y = (canvas.height - logoSize) / 2;
              ctx.save();
              const radius = logoSize * 0.2;
              if (logoFrame) {
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + logoSize - radius, y);
                ctx.quadraticCurveTo(x + logoSize, y, x + logoSize, y + radius);
                ctx.lineTo(x + logoSize, y + logoSize - radius);
                ctx.quadraticCurveTo(x + logoSize, y + logoSize, x + logoSize - radius, y + logoSize);
                ctx.lineTo(x + radius, y + logoSize);
                ctx.quadraticCurveTo(x, y + logoSize, x, y + logoSize - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.fillStyle = useTransparentBg ? (theme === 'dark' ? '#020617' : '#ffffff') : lightColor;
                ctx.fill();
                ctx.clip();
              }

              const imgAspect = img.width / img.height || 1;
              let drawWidth = logoSize;
              let drawHeight = logoSize;

              if (imgAspect > 1) {
                // Wider than tall
                drawHeight = logoSize / imgAspect;
              } else if (imgAspect < 1) {
                // Taller than wide
                drawWidth = logoSize * imgAspect;
              }

              const offsetX = x + (logoSize - drawWidth) / 2;
              const offsetY = y + (logoSize - drawHeight) / 2;

              ctx.globalAlpha = Math.min(Math.max(logoOpacity, 0), 1);
              ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
              ctx.globalAlpha = 1;
              ctx.restore();
            } catch (err) {
              console.error('Failed to draw logo on QR code', err);
            }
            resolve();
          };
          img.onerror = (err) => {
            console.error('Failed to load logo image', err);
            resolve();
          };
          img.src = logoSrc;
        });
      }

      const url = canvas.toDataURL('image/png');
      setQrDataUrl(url);
      setLastGeneratedAt(now);
    } catch (error) {
      console.error('Failed to generate QR code', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'qr-code.png';
    link.click();
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoSrc(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">QR Code Studio</h1>
          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/yad_qasim/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#F59E0B"
                    d="M13.028 2c1.125.003 1.696.009 2.189.023l.194.007c.224.008.445.018.712.03c1.064.05 1.79.218 2.427.465c.66.254 1.216.598 1.772 1.153a4.9 4.9 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428c.012.266.022.487.03.712l.006.194c.015.492.021 1.063.023 2.188l.001.746v1.31a79 79 0 0 1-.023 2.188l-.006.194c-.008.225-.018.446-.03.712c-.05 1.065-.22 1.79-.466 2.428a4.9 4.9 0 0 1-1.153 1.772a4.9 4.9 0 0 1-1.772 1.153c-.637.247-1.363.415-2.427.465l-.712.03l-.194.006c-.493.014-1.064.021-2.189.023l-.746.001h-1.309a78 78 0 0 1-2.189-.023l-.194-.006a63 63 0 0 1-.712-.031c-1.064-.05-1.79-.218-2.428-.465a4.9 4.9 0 0 1-1.771-1.153a4.9 4.9 0 0 1-1.154-1.772c-.247-.637-.415-1.363-.465-2.428l-.03-.712l-.005-.194A79 79 0 0 1 2 13.028v-2.056a79 79 0 0 1 .022-2.188l.007-.194c.008-.225.018-.446.03-.712c.05-1.065.218-1.79.465-2.428A4.9 4.9 0 0 1 3.68 3.678a4.9 4.9 0 0 1 1.77-1.153c.638-.247 1.363-.415 2.428-.465c.266-.012.488-.022.712-.03l.194-.006a79 79 0 0 1 2.188-.023zM12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10m0 2a3 3 0 1 1 .001 6a3 3 0 0 1 0-6m5.25-3.5a1.25 1.25 0 0 0 0 2.5a1.25 1.25 0 0 0 0-2.5"
                  />
                </svg>
              </span>
              <span>@yad_qasim</span>
            </a>
            <button
              type="button"
              onClick={() => applyTheme(theme === 'light' ? 'dark' : 'light')}
              className="inline-flex h-9 items-center rounded-full border border-border/70 bg-card px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 48 48"
                  className="h-4 w-4 text-black dark:text-white"
                  aria-hidden="true"
                >
                  <defs>
                    <mask id="SVGeUF2peIj">
                      <g
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="4"
                      >
                        <path
                          fill="#fff"
                          stroke="#fff"
                          d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4S4 12.954 4 24s8.954 20 20 20"
                        />
                        <path
                          stroke="#000"
                          d="M15 24h18m-13.5-7.794l9 15.588m0-15.588l-9 15.588"
                        />
                      </g>
                    </mask>
                  </defs>
                  <path fill="currentColor" d="M0 0h48v48H0z" mask="url(#SVGeUF2peIj)" />
                </svg>
              </span>
              <span>{theme === 'light' ? 'Light' : 'Dark'} mode</span>
            </button>
          </div>
        </div>
      </header>

      <section className="flex flex-1 justify-center px-4 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-6 md:space-y-8">
          {/* QR preview section (first) */}
          <div className="flex items-start justify-center">
            <div className="relative flex w-full max-w-sm flex-col rounded-2xl border border-border/70 bg-card p-4 md:p-5">
              <div className="flex w-full items-center justify-between pb-3 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/80">Preview</span>
                {qrDataUrl && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    Ready to download
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center pb-2">
                <div className="relative flex aspect-square w-full max-w-[240px] items-center justify-center">
                  <div className="absolute inset-3 rounded-3xl bg-gradient-to-br from-muted to-background" />
                  <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background p-4">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="Generated QR code" className="h-full w-full rounded-xl" />
                    ) : (
                      <p className="px-4 text-center text-xs text-muted-foreground">
                        Your QR preview will appear here after you generate it.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

              {/* Scannability indicator (simple heuristic) */}
              <div className="mb-2 flex items-center justify-center text-[11px]">
                {(() => {
                  const contrastBad = useTransparentBg ? false : bgColor.toLowerCase() === fgColor.toLowerCase();
                  const logoTooBig = logoScale > 22;
                  const risky = contrastBad || logoTooBig;
                  const label = risky ? 'Risky' : 'Good';
                  const description = risky
                    ? 'Try higher contrast colors or a smaller logo.'
                    : 'Looks good, but always test with your phone.';
                  return (
                    <div
                      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 ${
                        risky
                          ? 'border-yellow-500/70 bg-yellow-500/10 text-yellow-600'
                          : 'border-emerald-500/60 bg-emerald-500/5 text-emerald-600'
                      }`}
                    >
                      <span
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] font-bold ${
                          risky
                            ? 'border-yellow-500 text-yellow-600'
                            : 'border-emerald-500 text-emerald-600'
                        }`}
                      >
                        {risky ? '!' : '✓'}
                      </span>
                      <span className="font-medium">Scanability: {label}</span>
                      <span className="hidden text-[10px] text-muted-foreground/80 sm:inline">{description}</span>
                    </div>
                  );
                })()}
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={!qrDataUrl}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Download PNG
              </button>
            </div>
          </div>

          {/* Content + controls stacked below */}
          <div className="space-y-7 md:space-y-8">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Turn any text or link into a QR code</h2>
              <p className="text-sm text-muted-foreground">
                Paste a URL, a note, Wi-Fi credentials, or anything else. Generate a high quality QR code and download it as a PNG.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5 md:p-6">
              <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Content</label>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Paste a link or type any text you like..."
                rows={5}
                className="w-full resize-none rounded-xl border border-input bg-background/80 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <div className="flex items-center justify-between gap-3 pt-1 text-xs">
                <p className="text-muted-foreground">Your QR is generated locally in your browser.</p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !value.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? 'Generating…' : 'Generate QR'}
                </button>
              </div>
              {rateLimitMessage && <p className="pt-1 text-xs text-red-500/80">{rateLimitMessage}</p>}
            </div>

            <div className="space-y-4 text-xs text-muted-foreground">
              {/* Colors */}
              <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4 md:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">Colors</p>
                  <button
                    type="button"
                    onClick={() => applyPreset('classic')}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted"
                  >
                    Reset colors
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="w-16">Dots</span>
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent"
                      aria-label="QR foreground color"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="w-16">Background</span>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent"
                      aria-label="QR background color"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseTransparentBg((prev) => !prev)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium transition ${
                      useTransparentBg
                        ? 'bg-primary/10 text-primary'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-6 items-center rounded-full border ${
                        useTransparentBg
                          ? 'border-primary bg-primary/20 justify-end'
                          : 'border-border bg-background justify-start'
                      }`}
                    >
                      <span className="m-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    </span>
                    <span>No background</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 text-[11px]">
                  {[
                    { id: 'classic', label: 'Classic' },
                    { id: 'soft', label: 'Soft' },
                    { id: 'contrast', label: 'High contrast' },
                    { id: 'flag', label: 'Kurdistan flag' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyPreset(item.id as 'classic' | 'soft' | 'contrast' | 'flag')}
                      className={`rounded-full border px-3 py-1 font-medium transition ${
                        preset === item.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <div className="flex h-9 w-14 items-center justify-center rounded-lg border border-border bg-card/60">
                    <div
                      className="grid h-7 w-7 grid-cols-3 grid-rows-3 rounded-md border border-border bg-background"
                      style={{ background: useTransparentBg ? 'transparent' : bgColor }}
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <span
                          key={i}
                          className="h-full w-full rounded-[2px]"
                          style={{
                            background:
                              i % 2 === 0
                                ? fgColor
                                : useTransparentBg
                                  ? 'transparent'
                                  : bgColor
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-muted-foreground">Color preview</span>
                </div>
              </div>

              {/* Shape */}
              <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4 md:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">Shape</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShape('square');
                      setEyeShape('square');
                    }}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted"
                  >
                    Reset shapes
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {[
                    { id: 'square', label: 'Square (safest)' },
                    { id: 'rounded', label: 'Rounded' },
                    { id: 'dots', label: 'Dots' },
                    { id: 'pill', label: 'Pill' },
                    { id: 'diamond', label: 'Diamond' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setShape(
                          item.id as 'square' | 'rounded' | 'dots' | 'pill' | 'diamond'
                        )
                      }
                      className={`rounded-full border px-3 py-1 font-medium transition ${
                        shape === item.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px]">
                  <div className="flex h-9 w-auto items-center gap-1 rounded-lg border border-border bg-card/60 px-2">
                    {shape === 'square' && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background/80">
                        <div className="h-4 w-4 rounded-sm bg-foreground/90" />
                      </div>
                    )}
                    {shape === 'rounded' && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background/80">
                        <div className="h-4 w-4 rounded-lg bg-foreground/90" />
                      </div>
                    )}
                    {shape === 'dots' && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background/80">
                        <div className="flex gap-0.5">
                          <span className="h-2 w-2 rounded-full bg-foreground/90" />
                          <span className="h-2 w-2 rounded-full bg-foreground/60" />
                          <span className="h-2 w-2 rounded-full bg-foreground/40" />
                        </div>
                      </div>
                    )}
                    {shape === 'pill' && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background/80">
                        <div className="h-2.5 w-4 rounded-full bg-foreground/90" />
                      </div>
                    )}
                    {shape === 'diamond' && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background/80">
                        <div className="h-3 w-3 rotate-45 rounded-[2px] bg-foreground/90" />
                      </div>
                    )}
                  </div>
                  <span className="text-muted-foreground">Shape preview</span>
                </div>
                <div
                  className={`mt-2 inline-flex items-center gap-2 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground ${
                    shape === 'square' || shape === 'rounded'
                      ? 'border-border'
                      : 'border-yellow-500'
                  }`}
                >
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] font-bold ${
                      shape === 'square' || shape === 'rounded'
                        ? 'border-border text-foreground/80'
                        : 'border-yellow-500 text-yellow-500'
                    }`}
                  >
                    !
                  </span>
                  <span>
                    {shape === 'square' || shape === 'rounded'
                      ? 'Recommended for real use. These shapes are the most reliable for scanning.'
                      : 'Fun style: this shape might not scan on all devices. Always test before using it.'}
                  </span>
                </div>
              </div>

              {/* Corner (eye) style */}
              <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4 md:p-5">
                <p className="font-medium text-foreground">Corner style</p>
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground/80">Shape</span>
                    {[{ id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'circle', label: 'Circle' }, { id: 'diamond', label: 'Diamond' }].map(
                      (item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setEyeShape(item.id as 'square' | 'rounded' | 'circle' | 'diamond')}
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition ${
                            eyeShape === item.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {item.label}
                        </button>
                      )
                    )}
                  </div>
                  <label className="flex items-center gap-2">
                    <span className="text-muted-foreground/80">Color</span>
                    <input
                      type="color"
                      value={eyeColor ?? fgColor}
                      onChange={(e) => setEyeColor(e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent"
                      aria-label="Corner eye color"
                    />
                  </label>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <div className="flex h-9 w-14 items-center justify-center rounded-lg border border-border bg-card/60">
                    <div className="relative h-7 w-7 rounded-md bg-background">
                      <div
                        className="absolute inset-[3px] rounded-md"
                        style={{ background: useTransparentBg ? 'transparent' : bgColor }}
                      />
                      {eyeShape === 'square' && (
                        <div
                          className="absolute left-1 top-1 h-4 w-4 rounded-sm"
                          style={{ background: eyeColor || fgColor }}
                        />
                      )}
                      {eyeShape === 'rounded' && (
                        <div
                          className="absolute left-1 top-1 h-4 w-4 rounded-lg"
                          style={{ background: eyeColor || fgColor }}
                        />
                      )}
                      {eyeShape === 'circle' && (
                        <div
                          className="absolute left-2 top-2 h-3 w-3 rounded-full"
                          style={{ background: eyeColor || fgColor }}
                        />
                      )}
                      {eyeShape === 'diamond' && (
                        <div
                          className="absolute left-2 top-1.5 h-3 w-3 rotate-45 rounded-[2px]"
                          style={{ background: eyeColor || fgColor }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="text-muted-foreground">Corner preview</span>
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4 md:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">Logo (optional)</p>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFrame(true);
                      setLogoOpacity(1);
                      setLogoScale(20);
                    }}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted"
                  >
                    Reset logo
                  </button>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-[11px] text-muted-foreground file:mr-3 file:rounded-full file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground file:hover:bg-muted"
                />
                {logoSrc && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card/60">
                      <img src={logoSrc} alt="Logo preview" className="max-h-9 max-w-9 object-contain" />
                    </div>
                    <span className="text-[11px] text-muted-foreground">Current logo</span>
                  </div>
                )}

                <div className="space-y-2 pt-1 text-[11px] text-muted-foreground">
                  <p>A small square logo works best. It will be centered on top of your QR.</p>
                  <div className="flex items-center gap-2">
                    <span className="w-20">Logo size</span>
                    <input
                      type="range"
                      min={12}
                      max={22}
                      value={logoScale}
                      onChange={(e) => setLogoScale(Number(e.target.value))}
                      className="h-1 w-full cursor-pointer accent-primary"
                    />
                    <span>{logoScale}%</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="w-20">Opacity</span>
                    <input
                      type="range"
                      min={0.4}
                      max={1}
                      step={0.05}
                      value={logoOpacity}
                      onChange={(e) => setLogoOpacity(Number(e.target.value))}
                      className="h-1 w-full cursor-pointer accent-primary"
                    />
                    <span>{Math.round(logoOpacity * 100)}%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogoFrame((prev) => !prev)}
                    className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                      logoFrame
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-6 items-center rounded-full border ${
                        logoFrame
                          ? 'border-primary bg-primary/20 justify-end'
                          : 'border-border bg-background justify-start'
                      }`}
                    >
                      <span className="m-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    </span>
                    <span>{logoFrame ? 'Logo background on' : 'Logo background off'}</span>
                  </button>
                  {logoSrc && (
                    <button
                      type="button"
                      onClick={() => setLogoSrc(null)}
                      className="mt-2 inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted"
                    >
                      Remove logo
                    </button>
                  )}
                  <p className="pt-1 text-[10px] text-muted-foreground/80">
                    Tip: Keeping the logo under ~22% of the QR helps it stay easy to scan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

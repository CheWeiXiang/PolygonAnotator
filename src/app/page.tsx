"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Trash2,
  Undo2,
  Plus,
  Copy,
  Check,
  MousePointer2,
  Layers,
  Code2,
  ImageIcon,
} from "lucide-react";

type Point = { x: number; y: number };

export default function PolygonAnnotator() {
  const [image, setImage] = useState<string | null>(null);
  const [polygons, setPolygons] = useState<Point[][]>([[]]);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [customName, setCustomName] = useState<string>("region");
  const [start, setStart] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentIndex = polygons.length - 1;
  const currentPoints = polygons[currentIndex];
  const completedPolygons = polygons.filter((p) => p.length > 0).length;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setPolygons([[]]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setPolygons([[]]);
  };

  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const newPoint = { x: Math.round(x), y: Math.round(y) };

    setPolygons((prev) => {
      const updated = [...prev];
      updated[currentIndex] = [...updated[currentIndex], newPoint];
      return updated;
    });
  };

  const finishPolygon = useCallback(() => {
    if (currentPoints.length === 0) return;
    setPolygons((prev) => [...prev, []]);
  }, [currentPoints]);

  const undoPoint = useCallback(() => {
    setPolygons((prev) => {
      const updated = [...prev];
      updated[currentIndex] = updated[currentIndex].slice(0, -1);
      return updated;
    });
  }, [currentIndex]);

  const resetAll = () => {
    setPolygons([[]]);
  };

  const copyToClipboard = () => {
    const output = polygons
      .filter((p) => p.length > 0)
      .map((poly, i) => {
        const points = poly.map((p) => `${p.x},${p.y}`).join(" ");
        return `<g id="${customName}-${start + i}">\n  <polygon fill="#00ff00" points="${points}" />\n</g>`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.key.toLowerCase() === "n") {
        finishPolygon();
      }
      if (e.key.toLowerCase() === "z" && !e.metaKey && !e.ctrlKey) {
        undoPoint();
      }
      if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey) {
        resetAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finishPolygon, undoPoint]);

  const svgOutput = polygons
    .filter((p) => p.length > 0)
    .map((poly, i) => {
      const points = poly.map((p) => `${p.x},${p.y}`).join(" ");
      return `<g id="${customName}-${start + i}">\n  <polygon fill="#00ff00" points="${points}" />\n</g>`;
    })
    .join("\n\n");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">
              Polygon Annotator
            </span>
          </div>

          {image && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="gap-1.5">
                  <MousePointer2 className="w-3 h-3" />
                  {currentPoints.length} points
                </Badge>
                <Badge variant="secondary" className="gap-1.5">
                  <Layers className="w-3 h-3" />
                  {completedPolygons} shapes
                </Badge>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!image ? (
          /* Upload Area */
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div
              className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-6">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Upload an image to annotate
              </h2>
              <p className="text-muted-foreground mb-6">
                Drag and drop an image here, or click to browse
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Choose Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          /* Editor Layout */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* Canvas Area */}
            <div className="space-y-4">
              {/* Toolbar */}
              <Card className="border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Change Image
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleChange}
                        className="hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={undoPoint}
                        disabled={currentPoints.length === 0}
                        className="gap-2"
                      >
                        <Undo2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Undo</span>
                        <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
                          Z
                        </kbd>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={finishPolygon}
                        disabled={currentPoints.length < 3}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Shape</span>
                        <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
                          N
                        </kbd>
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={resetAll}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Reset</span>
                        <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
                          R
                        </kbd>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Image Canvas */}
              <Card className="border-border bg-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative bg-[#0a0a0a] rounded-lg overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyMCAwIDIwIDIwIDAgMjAgMCAwIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjIiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
                    <img
                      src={image}
                      onClick={handleClick}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setSize({
                          w: img.naturalWidth,
                          h: img.naturalHeight,
                        });
                      }}
                      className="relative max-w-full w-full h-auto block cursor-crosshair bg-white"
                      alt="Annotate this image"
                    />

                    <svg
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 ${size.w} ${size.h}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {polygons.map((poly, i) => {
                        const isActive = i === currentIndex;
                        return (
                          <g key={i}>
                            {/* Shape fill */}
                            {poly.length > 2 && (
                              <polygon
                                points={poly.map((p) => `${p.x},${p.y}`).join(" ")}
                                fill={isActive ? "rgba(160, 120, 255, 0.2)" : "rgba(100, 200, 150, 0.25)"}
                                stroke={isActive ? "#a078ff" : "#64c896"}
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                            )}

                            {/* Lines for active polygon */}
                            {isActive && poly.length > 1 && poly.length <= 2 && (
                              <polyline
                                points={poly.map((p) => `${p.x},${p.y}`).join(" ")}
                                fill="none"
                                stroke="#a078ff"
                                strokeWidth="2"
                                strokeDasharray="8,4"
                              />
                            )}

                            {/* Points */}
                            {poly.map((p, j) => (
                              <g key={j}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="8"
                                  fill={isActive ? "#a078ff" : "#64c896"}
                                  opacity="0.3"
                                />
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="4"
                                  fill={isActive ? "#a078ff" : "#64c896"}
                                  stroke="#fff"
                                  strokeWidth="2"
                                />
                              </g>
                            ))}

                            {/* Label for completed polygons */}
                            {!isActive && poly.length > 0 && (
                              <text
                                x={poly.reduce((sum, p) => sum + p.x, 0) / poly.length}
                                y={poly.reduce((sum, p) => sum + p.y, 0) / poly.length}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#fff"
                                fontSize="14"
                                fontWeight="600"
                                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                              >
                                {customName}-{start + i}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </CardContent>
              </Card>

              {/* Image info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                <span>
                  Image size: {size.w} × {size.h}px
                </span>
                <span>Click to add points</span>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Settings */}
              <Card className="border-border bg-card">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-primary" />
                    Export Settings
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        ID Prefix
                      </label>
                      <Input
                        type="text"
                        value={customName}
                        onChange={(e: any) => setCustomName(e.target.value)}
                        placeholder="region"
                        className="bg-secondary border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        Start Number
                      </label>
                      <Input
                        type="number"
                        value={start}
                        onChange={(e: any) => setStart(parseInt(e.target.value) || 1)}
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Output */}
              <Card className="border-border bg-card">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">SVG Output</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      disabled={completedPolygons === 0 && currentPoints.length === 0}
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-accent" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <pre className="bg-secondary rounded-lg p-4 text-xs font-mono text-muted-foreground overflow-x-auto max-h-[400px] overflow-y-auto">
                      {svgOutput || (
                        <span className="text-muted-foreground/50 italic">
                          Start drawing to generate SVG code...
                        </span>
                      )}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* Shortcuts */}
              <Card className="border-border bg-card">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-medium text-foreground text-sm">
                    Keyboard Shortcuts
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>New polygon</span>
                      <kbd className="h-6 px-2 inline-flex items-center rounded border border-border bg-muted font-mono text-xs">
                        N
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Undo point</span>
                      <kbd className="h-6 px-2 inline-flex items-center rounded border border-border bg-muted font-mono text-xs">
                        Z
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Reset all</span>
                      <kbd className="h-6 px-2 inline-flex items-center rounded border border-border bg-muted font-mono text-xs">
                        R
                      </kbd>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

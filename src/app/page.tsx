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
  Square,
  Move,
} from "lucide-react";

type Point = { x: number; y: number };
type Shape = {
  type: "polygon" | "rect";
  points: Point[];
};

export default function PolygonAnnotator() {
  const [image, setImage] = useState<string | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [currentShape, setCurrentShape] = useState<Shape>({ type: "polygon", points: [] });
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [customName, setCustomName] = useState<string>("region");
  const [start, setStart] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rectMode, setRectMode] = useState(false);
  const [rectStart, setRectStart] = useState<Point | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [clipboard, setClipboard] = useState<Shape[]>([]);
  const [isDraggingShapes, setIsDraggingShapes] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [altKeyHeld, setAltKeyHeld] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const completedShapes = shapes.filter((s) => s.points.length > 0).length;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setShapes([]);
    setCurrentShape({ type: "polygon", points: [] });
    setSelectedIndices(new Set());
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setShapes([]);
    setCurrentShape({ type: "polygon", points: [] });
    setSelectedIndices(new Set());
  };

  const getImageCoords = (e: React.MouseEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return null;
    const img = container.querySelector("img");
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x: Math.round(x), y: Math.round(y) };
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    // Don't add points if we're dragging shapes
    if (isDraggingShapes) return;

    const coords = getImageCoords(e);
    if (!coords) return;

    if (rectMode) {
      if (!rectStart) {
        // First click - set start point
        setRectStart(coords);
      } else {
        // Second click - create rectangle
        const minX = Math.min(rectStart.x, coords.x);
        const maxX = Math.max(rectStart.x, coords.x);
        const minY = Math.min(rectStart.y, coords.y);
        const maxY = Math.max(rectStart.y, coords.y);

        const rectPoints: Point[] = [
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: maxX, y: maxY },
          { x: minX, y: maxY },
        ];

        setShapes((prev) => [...prev, { type: "rect", points: rectPoints }]);
        setRectStart(null);
      }
    } else {
      // Polygon mode
      setCurrentShape((prev) => ({
        ...prev,
        points: [...prev.points, coords],
      }));
    }
  };

  const handleShapeClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      // Toggle selection with Ctrl/Cmd
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    } else if (e.shiftKey) {
      // Add to selection with Shift
      setSelectedIndices((prev) => new Set([...prev, index]));
    } else {
      // Single select
      setSelectedIndices(new Set([index]));
    }
  };

  const handleShapeMouseDown = (e: React.MouseEvent<SVGGElement>, index: number) => {
    if (!selectedIndices.has(index) && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      setSelectedIndices(new Set([index]));
    }

    if (selectedIndices.has(index) || (!e.ctrlKey && !e.metaKey && !e.shiftKey)) {
      const coords = getImageCoords(e as unknown as React.MouseEvent<HTMLElement>);
      if (coords) {
        setIsDraggingShapes(true);
        setDragStart(coords);
        setDragOffset({ x: 0, y: 0 });
        e.preventDefault();
      }
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingShapes || !dragStart) return;

      const container = containerRef.current;
      if (!container) return;
      const img = container.querySelector("img");
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      setDragOffset({
        x: Math.round(x) - dragStart.x,
        y: Math.round(y) - dragStart.y,
      });
    },
    [isDraggingShapes, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    if (isDraggingShapes && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      // Apply the offset to selected shapes
      setShapes((prev) =>
        prev.map((shape, i) => {
          if (selectedIndices.has(i)) {
            return {
              ...shape,
              points: shape.points.map((p) => ({
                x: p.x + dragOffset.x,
                y: p.y + dragOffset.y,
              })),
            };
          }
          return shape;
        })
      );
    }
    setIsDraggingShapes(false);
    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
  }, [isDraggingShapes, dragOffset, selectedIndices]);

  useEffect(() => {
    if (isDraggingShapes) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingShapes, handleMouseMove, handleMouseUp]);

  const finishPolygon = useCallback(() => {
    if (currentShape.points.length < 3) return;
    setShapes((prev) => [...prev, currentShape]);
    setCurrentShape({ type: "polygon", points: [] });
  }, [currentShape]);

  const undoPoint = useCallback(() => {
    if (rectMode && rectStart) {
      setRectStart(null);
    } else {
      setCurrentShape((prev) => ({
        ...prev,
        points: prev.points.slice(0, -1),
      }));
    }
  }, [rectMode, rectStart]);

  const resetAll = () => {
    setShapes([]);
    setCurrentShape({ type: "polygon", points: [] });
    setRectStart(null);
    setSelectedIndices(new Set());
  };

  const deleteSelected = useCallback(() => {
    if (selectedIndices.size === 0) return;
    setShapes((prev) => prev.filter((_, i) => !selectedIndices.has(i)));
    setSelectedIndices(new Set());
  }, [selectedIndices]);

  const copySelected = useCallback(() => {
    if (selectedIndices.size === 0) return;
    const selectedShapes = shapes.filter((_, i) => selectedIndices.has(i));
    setClipboard(selectedShapes);
  }, [selectedIndices, shapes]);

  const pasteShapes = useCallback(() => {
    if (clipboard.length === 0) return;
    // Offset pasted shapes slightly
    const offset = 20;
    const pastedShapes = clipboard.map((shape) => ({
      ...shape,
      points: shape.points.map((p) => ({
        x: p.x + offset,
        y: p.y + offset,
      })),
    }));
    const newStartIndex = shapes.length;
    setShapes((prev) => [...prev, ...pastedShapes]);
    // Select the pasted shapes
    setSelectedIndices(
      new Set(pastedShapes.map((_, i) => newStartIndex + i))
    );
  }, [clipboard, shapes.length]);

  const selectAll = useCallback(() => {
    setSelectedIndices(new Set(shapes.map((_, i) => i)));
  }, [shapes]);

  const copyToClipboard = () => {
    const output = shapes
      .filter((s) => s.points.length > 0)
      .map((shape, i) => {
        const points = shape.points.map((p) => `${p.x},${p.y}`).join(" ");
        return `<g id="${customName}-${start + i}">\n  <polygon fill="#00ff00" points="${points}" />\n</g>`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Track Alt key state for bypassing shape selection
  useEffect(() => {
    const handleAltDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setAltKeyHeld(true);
      }
    };
    const handleAltUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setAltKeyHeld(false);
      }
    };
    window.addEventListener("keydown", handleAltDown);
    window.addEventListener("keyup", handleAltUp);
    // Also reset when window loses focus
    window.addEventListener("blur", () => setAltKeyHeld(false));
    return () => {
      window.removeEventListener("keydown", handleAltDown);
      window.removeEventListener("keyup", handleAltUp);
      window.removeEventListener("blur", () => setAltKeyHeld(false));
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      // Shift + R to toggle rect mode
      if (e.key.toLowerCase() === "r" && e.shiftKey) {
        e.preventDefault();
        setRectMode((prev) => !prev);
        setRectStart(null);
        return;
      }

      if (e.key.toLowerCase() === "n") {
        finishPolygon();
      }
      if (e.key.toLowerCase() === "z" && !e.metaKey && !e.ctrlKey) {
        undoPoint();
      }
      if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        resetAll();
      }
      // Ctrl/Cmd + C to copy selected
      if (e.key.toLowerCase() === "c" && (e.metaKey || e.ctrlKey)) {
        if (selectedIndices.size > 0) {
          e.preventDefault();
          copySelected();
        }
      }
      // Ctrl/Cmd + V to paste
      if (e.key.toLowerCase() === "v" && (e.metaKey || e.ctrlKey)) {
        if (clipboard.length > 0) {
          e.preventDefault();
          pasteShapes();
        }
      }
      // Ctrl/Cmd + A to select all
      if (e.key.toLowerCase() === "a" && (e.metaKey || e.ctrlKey)) {
        if (shapes.length > 0) {
          e.preventDefault();
          selectAll();
        }
      }
      // Delete or Backspace to delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIndices.size > 0 && (e.target as HTMLElement).tagName !== "INPUT") {
          e.preventDefault();
          deleteSelected();
        }
      }
      // Escape to deselect
      if (e.key === "Escape") {
        setSelectedIndices(new Set());
        setRectStart(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finishPolygon, undoPoint, copySelected, pasteShapes, selectAll, deleteSelected, selectedIndices, clipboard, shapes]);

  const svgOutput = shapes
    .filter((s) => s.points.length > 0)
    .map((shape, i) => {
      const points = shape.points.map((p) => `${p.x},${p.y}`).join(" ");
      return `<g id="${customName}-${start + i}">\n  <polygon fill="#00ff00" points="${points}" />\n</g>`;
    })
    .join("\n\n");

  // Get shape points with drag offset applied for rendering
  const getDisplayPoints = (shape: Shape, index: number) => {
    if (isDraggingShapes && selectedIndices.has(index)) {
      return shape.points.map((p) => ({
        x: p.x + dragOffset.x,
        y: p.y + dragOffset.y,
      }));
    }
    return shape.points;
  };

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
                {rectMode && (
                  <Badge variant="default" className="gap-1.5 bg-orange-500">
                    <Square className="w-3 h-3" />
                    Rect Mode
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1.5">
                  <MousePointer2 className="w-3 h-3" />
                  {currentShape.points.length} points
                </Badge>
                <Badge variant="secondary" className="gap-1.5">
                  <Layers className="w-3 h-3" />
                  {completedShapes} shapes
                </Badge>
                {selectedIndices.size > 0 && (
                  <Badge variant="outline" className="gap-1.5 border-primary text-primary">
                    {selectedIndices.size} selected
                  </Badge>
                )}
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

                      <Button
                        variant={rectMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setRectMode((prev) => !prev);
                          setRectStart(null);
                        }}
                        className="gap-2"
                      >
                        <Square className="w-4 h-4" />
                        <span className="hidden sm:inline">Rect</span>
                        <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
                          ⇧R
                        </kbd>
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={undoPoint}
                        disabled={currentShape.points.length === 0 && !rectStart}
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
                        disabled={currentShape.points.length < 3 || rectMode}
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
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Image Canvas */}
              <Card className="border-border bg-card overflow-hidden">
                <CardContent className="p-0">
                  <div
                    ref={containerRef}
                    className="relative bg-[#0a0a0a] rounded-lg overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyMCAwIDIwIDIwIDAgMjAgMCAwIiBmaWxsPSJub25lIiBzdHJva2U9IiMyMjIiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
                    <img
                      src={image}
                      onClick={handleImageClick}
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
                      {/* Completed shapes */}
                      {shapes.map((shape, i) => {
                        const isSelected = selectedIndices.has(i);
                        const displayPoints = getDisplayPoints(shape, i);
                        return (
                          <g
                            key={i}
                            className={altKeyHeld ? "pointer-events-none" : "pointer-events-auto cursor-pointer"}
                            onClick={(e) => handleShapeClick(e, i)}
                            onMouseDown={(e) => handleShapeMouseDown(e, i)}
                          >
                            {/* Shape fill */}
                            {displayPoints.length > 2 && (
                              <polygon
                                points={displayPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                                fill={isSelected ? "rgba(59, 130, 246, 0.3)" : "rgba(100, 200, 150, 0.25)"}
                                stroke={isSelected ? "#3b82f6" : "#64c896"}
                                strokeWidth={isSelected ? "3" : "2"}
                                strokeLinejoin="round"
                              />
                            )}

                            {/* Points */}
                            {displayPoints.map((p, j) => (
                              <g key={j}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="8"
                                  fill={isSelected ? "#3b82f6" : "#64c896"}
                                  opacity="0.3"
                                />
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="4"
                                  fill={isSelected ? "#3b82f6" : "#64c896"}
                                  stroke="#fff"
                                  strokeWidth="2"
                                />
                              </g>
                            ))}

                            {/* Label */}
                            {displayPoints.length > 0 && (
                              <text
                                x={displayPoints.reduce((sum, p) => sum + p.x, 0) / displayPoints.length}
                                y={displayPoints.reduce((sum, p) => sum + p.y, 0) / displayPoints.length}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#fff"
                                fontSize="14"
                                fontWeight="600"
                                className="pointer-events-none"
                                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                              >
                                {customName}-{start + i}
                              </text>
                            )}

                            {/* Selection indicator */}
                            {isSelected && (
                              <g className="pointer-events-none">
                                <Move
                                  x={displayPoints.reduce((sum, p) => sum + p.x, 0) / displayPoints.length - 8}
                                  y={displayPoints.reduce((sum, p) => sum + p.y, 0) / displayPoints.length - 30}
                                  className="w-4 h-4 text-blue-500"
                                />
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Current polygon being drawn */}
                      {!rectMode && currentShape.points.length > 0 && (
                        <g>
                          {currentShape.points.length > 2 && (
                            <polygon
                              points={currentShape.points.map((p) => `${p.x},${p.y}`).join(" ")}
                              fill="rgba(160, 120, 255, 0.2)"
                              stroke="#a078ff"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                          )}

                          {currentShape.points.length > 1 && currentShape.points.length <= 2 && (
                            <polyline
                              points={currentShape.points.map((p) => `${p.x},${p.y}`).join(" ")}
                              fill="none"
                              stroke="#a078ff"
                              strokeWidth="2"
                              strokeDasharray="8,4"
                            />
                          )}

                          {currentShape.points.map((p, j) => (
                            <g key={j}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="8"
                                fill="#a078ff"
                                opacity="0.3"
                              />
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                fill="#a078ff"
                                stroke="#fff"
                                strokeWidth="2"
                              />
                            </g>
                          ))}
                        </g>
                      )}

                      {/* Rect mode start point */}
                      {rectMode && rectStart && (
                        <g>
                          <circle
                            cx={rectStart.x}
                            cy={rectStart.y}
                            r="8"
                            fill="#f97316"
                            opacity="0.3"
                          />
                          <circle
                            cx={rectStart.x}
                            cy={rectStart.y}
                            r="4"
                            fill="#f97316"
                            stroke="#fff"
                            strokeWidth="2"
                          />
                          <text
                            x={rectStart.x}
                            y={rectStart.y - 15}
                            textAnchor="middle"
                            fill="#f97316"
                            fontSize="12"
                            fontWeight="600"
                          >
                            Click to set corner
                          </text>
                        </g>
                      )}
                    </svg>
                  </div>
                </CardContent>
              </Card>

              {/* Image info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                <span>
                  Image size: {size.w} × {size.h}px
                </span>
                <span>{rectMode ? "Click two corners to draw rectangle" : "Click to add points"}</span>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Selection Actions */}
              {selectedIndices.size > 0 && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      <Move className="w-4 h-4 text-primary" />
                      {selectedIndices.size} Shape{selectedIndices.size > 1 ? "s" : ""} Selected
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copySelected}
                        className="flex-1 gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={pasteShapes}
                        disabled={clipboard.length === 0}
                        className="flex-1 gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Paste
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={deleteSelected}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Drag selected shapes to move them
                    </p>
                  </CardContent>
                </Card>
              )}

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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomName(e.target.value)}
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStart(parseInt(e.target.value) || 1)}
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
                      disabled={completedShapes === 0}
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
                      <span>Rectangle mode</span>
                      <kbd className="h-6 px-2 inline-flex items-center rounded border border-border bg-muted font-mono text-xs">
                        ⇧R
                      </kbd>
                    </div>
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
                      <span>Copy selected</span>
                      <kbd className="h-6 px-2 inline-flex items-center rounded border border-border bg-muted font-mono text-xs">
                        ⌘C
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Paste</span>
                      <kbd className="h-6 px-2 inline-flex items-center rounded border border-border bg-muted font-mono text-xs">
                        ⌘V
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Select all</span>
                      <kbd className="h-6 px-2 inline-flex items-center rounded border border-border bg-muted font-mono text-xs">
                        ⌘A
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Delete selected</span>
                      <kbd className="h-6 px-2 inline-flex items-center rounded border border-border bg-muted font-mono text-xs">
                        Del
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Deselect</span>
                      <kbd className="h-6 px-2 inline-flex items-center rounded border border-border bg-muted font-mono text-xs">
                        Esc
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

"use client";

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";

/**
 * Lightweight virtual scrolling component for long lists.
 * Only renders items visible in the viewport + a small overscan buffer.
 * Eliminates performance issues with 1000+ row tables (materials, pricing history).
 *
 * Usage:
 *   <VirtualList
 *     items={myItems}
 *     itemHeight={48}
 *     renderItem={(item, index) => <Row key={item.id} {...item} />}
 *     className="h-[600px]"
 *   />
 */

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  ariaLabel?: string;
  emptyState?: ReactNode;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className = "",
  ariaLabel,
  emptyState,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry?.contentRect.height ?? 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(
      <div
        key={i}
        style={{
          position: "absolute",
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(items[i]!, i)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={"overflow-y-auto " + className}
      role="list"
      aria-label={ariaLabel}
    >
      <div style={{ position: "relative", height: totalHeight }}>
        {visibleItems}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DataTableFilter {
  column: string;
  label: string;
  options: { label: string; value: string }[];
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchColumn?: string;
  filters?: DataTableFilter[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  pageSize?: number;
  caption?: string;
  actions?: React.ReactNode;
}

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc") return <ArrowUp className="ml-1.5 inline size-3.5 shrink-0 text-primary" />;
  if (direction === "desc") return <ArrowDown className="ml-1.5 inline size-3.5 shrink-0 text-primary" />;
  return <ArrowUpDown className="ml-1.5 inline size-3.5 shrink-0 opacity-40" />;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = "Search…",
  searchColumn,
  filters = [],
  loading = false,
  emptyMessage = "No results found.",
  emptyIcon: EmptyIcon,
  pageSize = 10,
  caption,
  actions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [mounted, setMounted] = React.useState(false);
  const [visibleRows, setVisibleRows] = React.useState(pageSize);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    setVisibleRows(pageSize);
  }, [globalFilter, columnFilters, sorting, pageSize]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const totalRows = table.getRowModel().rows.length;
  const rowsToRender = table.getRowModel().rows.slice(0, visibleRows);

  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useCallback(
    (node: HTMLTableRowElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleRows((prev) => prev + pageSize);
          }
        },
        { root: scrollContainerRef.current, rootMargin: "100px", threshold: 0 }
      );
      if (node) observerRef.current.observe(node);
    },
    [loading, pageSize]
  );

  const skeletonRows = Array.from({ length: Math.min(pageSize, 10) });

  return (
    <div className="space-y-3">
      {(searchable || filters.length > 0 || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={
                    searchColumn
                      ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
                      : globalFilter
                  }
                  onChange={(e) => {
                    if (searchColumn) {
                      table.getColumn(searchColumn)?.setFilterValue(e.target.value);
                    } else {
                      setGlobalFilter(e.target.value);
                    }
                  }}
                  className="h-9 w-56 rounded-md border border-default bg-white pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>
            )}

            {filters.map((f) =>
              mounted ? (
                <Select
                  key={f.column}
                  value={(table.getColumn(f.column)?.getFilterValue() as string) ?? ""}
                  onValueChange={(v) =>
                    table.getColumn(f.column)?.setFilterValue(v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-9 w-40 rounded-md border-default bg-white text-sm [&>span]:flex-1 [&>span]:text-center">
                    <SelectValue placeholder={f.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All {f.label}</SelectItem>
                    {f.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div key={f.column} className="h-9 w-40 rounded-md border border-default bg-white" />
              )
            )}
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-default bg-white">
        <div ref={scrollContainerRef}>
          <Table>
            {caption && (
              <caption className="px-4 py-2 text-center text-xs text-muted border-t">{caption}</caption>
            )}
            <TableHeader className="sticky top-0 z-10">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="border-b border-default bg-subtle/30 hover:bg-subtle">
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined }}
                        className={`h-9 border-r border-default px-3 py-2 text-xs font-bold uppercase tracking-widest text-secondary last:border-r-0 select-none bg-subtle/30 ${header.column.id === "actions" ? "text-center" : "text-left"}`}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <span className={canSort ? "cursor-pointer inline-flex items-center" : header.column.id === "actions" ? "inline-flex items-center justify-center w-full" : ""}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && <SortIcon direction={sorted} />}
                        </span>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {loading ? (
                skeletonRows.map((_, i) => (
                  <TableRow key={i} className="border-b border-default">
                    {columns.map((_, ci) => (
                      <TableCell key={ci} className="h-9 border-r border-default px-3 py-2 last:border-r-0">
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rowsToRender.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-16 text-center">
                    {EmptyIcon && <EmptyIcon className="mx-auto mb-3 size-9 text-muted" />}
                    <p className="text-sm text-secondary font-medium">{emptyMessage}</p>
                  </TableCell>
                </TableRow>
              ) : (
                rowsToRender.map((row, index) => {
                  const isLastRendered = index === rowsToRender.length - 1;
                  const hasMore = visibleRows < totalRows;
                  return (
                    <TableRow
                      key={row.id}
                      ref={isLastRendered && hasMore ? loadMoreRef : null}
                      className="border-b border-default last:border-b-0 hover:bg-subtle/60 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          style={{ width: cell.column.columnDef.size ? `${cell.column.columnDef.size}px` : undefined }}
                          className="h-5 border-r border-default px-3 text-sm last:border-r-0"
                        >
                          {cell.column.id === "actions" ? (
                            <div className="flex items-center justify-center w-full h-full">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
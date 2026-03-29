"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type Column,
} from "@tanstack/react-table";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  X,
} from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
}

/* ------------------------------------------------------------------ */
/*  Column-header popover: sort + per-column text filter               */
/* ------------------------------------------------------------------ */
function ColumnHeaderMenu<TData>({
  column,
  title,
}: {
  column: Column<TData, unknown>;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSort = column.getCanSort();
  const canFilter = column.getCanFilter();
  const sortDir = column.getIsSorted();
  const filterValue = (column.getFilterValue() as string) ?? "";
  const hasFilter = filterValue.length > 0;

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // auto-focus input
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const SortIcon = sortDir === "asc" ? ArrowUp : sortDir === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <div ref={ref} className="relative flex items-center gap-1 select-none">
      {/* Sort button — click the label to sort */}
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => {
          if (!canSort) return;
          if (sortDir === "asc") column.toggleSorting(true);
          else if (sortDir === "desc") column.clearSorting();
          else column.toggleSorting(false);
        }}
        title={canSort ? "Ordenar" : undefined}
      >
        <span>{title}</span>
        {canSort && (
          <SortIcon
            className={`h-3.5 w-3.5 shrink-0 ${sortDir ? "text-foreground" : "text-muted-foreground/50"}`}
          />
        )}
      </button>

      {/* Filter toggle */}
      {canFilter && (
        <button
          type="button"
          className={`p-0.5 rounded hover:bg-muted transition-colors ${hasFilter ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
          onClick={() => setOpen((v) => !v)}
          title="Filtrar coluna"
        >
          <Filter className="h-3 w-3" />
        </button>
      )}

      {/* Dropdown */}
      {open && canFilter && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[180px] rounded-md border bg-popover p-2 shadow-md">
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              placeholder="Filtrar..."
              value={filterValue}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="h-7 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") setOpen(false);
              }}
            />
            {hasFilter && (
              <button
                type="button"
                className="p-1 rounded hover:bg-muted text-muted-foreground"
                onClick={() => {
                  column.setFilterValue(undefined);
                  setOpen(false);
                }}
                title="Limpar filtro"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main DataTable                                                     */
/* ------------------------------------------------------------------ */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Filtrar...",
  pageSize = 50,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize } },
  });

  const activeFilters = columnFilters.length;

  const clearAllFilters = useCallback(() => {
    setColumnFilters([]);
    // Also clear the global search if present
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(undefined);
    }
  }, [searchKey, table]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {searchKey && (
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(e) =>
                table.getColumn(searchKey)?.setFilterValue(e.target.value)
              }
              className="pl-8"
            />
          </div>
        )}
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Limpar {activeFilters} filtro(s)
          </button>
        )}
      </div>

      <div className="rounded-md border border-border overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-[600px] sm:min-w-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canInteract = header.column.getCanSort() || header.column.getCanFilter();
                    const headerContent = header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext());

                    // If header is a plain string and column can sort/filter, wrap in ColumnHeaderMenu
                    const useMenu =
                      canInteract &&
                      typeof header.column.columnDef.header === "string";

                    return (
                      <TableHead key={header.id} className="whitespace-nowrap">
                        {useMenu ? (
                          <ColumnHeaderMenu
                            column={header.column}
                            title={header.column.columnDef.header as string}
                          />
                        ) : (
                          headerContent
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Nenhum resultado encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
          {table.getFilteredRowModel().rows.length} registro(s)
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

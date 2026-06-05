"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShieldOff,
  Trash2,
  Loader2,
  Plus,
  Search,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type TrustedIp = {
  id: string;
  label: string;
  ip_range: string;
  created_at: string;
  last_active?: string;
  status?: "active" | "inactive";
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).split("/").join("-");
}

export default function TrustedIpsPage() {
  const [label, setLabel] = useState("");
  const [ipRange, setIpRange] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ trustedIps: TrustedIp[] }>({
    queryKey: ["trusted-ips"],
    queryFn: async () => {
      const res = await fetch("/api/admin/trusted-ips", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch trusted IPs");
      return res.json();
    },
  });

  const addIpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/trusted-ips", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), ip_range: ipRange.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add IP");
      return json;
    },
    onSuccess: () => {
      toast.success("IP added successfully");
      setLabel("");
      setIpRange("");
      queryClient.invalidateQueries({ queryKey: ["trusted-ips"] });
    },
    onError: (e: Error) => {
      if (e.message.includes("already trusted")) {
        toast.error("Already trusted");
      } else {
        toast.error(e.message);
      }
    },
  });

  const deleteIpMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/trusted-ips/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete IP");
      return res.json();
    },
    onSuccess: () => {
      toast.success("IP removed");
      queryClient.invalidateQueries({ queryKey: ["trusted-ips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/trusted-ips/${id}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      );
    },
    onSuccess: () => {
      toast.success(`${selected.size} IP(s) removed`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["trusted-ips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const trustedIps = data?.trustedIps ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trustedIps;
    return trustedIps.filter(
      (ip) =>
        ip.label.toLowerCase().includes(q) ||
        ip.ip_range.toLowerCase().includes(q)
    );
  }, [trustedIps, search]);

  const allSelected =
    filtered.length > 0 && filtered.every((ip) => selected.has(ip.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((ip) => ip.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  return (
    <div className="w-full p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Trusted IP Addresses</h1>
        <p className="text-sm text-muted-foreground">
          IP addresses that bypass the unknown-IP alert. Punches from these IPs are marked as trusted automatically.
        </p>
      </div>

      {/* Add Form Panel */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Add New Trusted IP Address</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!label.trim() || !ipRange.trim()) return;
            addIpMutation.mutate();
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          {/* Icon */}
          <div className="flex items-center justify-center size-10 rounded-lg bg-green-600 text-white shrink-0 self-end mb-0.5">
            <Plus className="size-5" />
          </div>

          <div className="flex-1 space-y-1.5">
            <Label htmlFor="ip-label">Label</Label>
            <Input
              id="ip-label"
              type="text"
              placeholder="e.g., Remote Branch"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={addIpMutation.isPending}
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <Label htmlFor="ip-range">IP Address</Label>
            <Input
              id="ip-range"
              type="text"
              placeholder="e.g., 192.168.1.10"
              value={ipRange}
              onChange={(e) => setIpRange(e.target.value)}
              disabled={addIpMutation.isPending}
            />
          </div>

          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white shrink-0"
            disabled={addIpMutation.isPending || !label.trim() || !ipRange.trim()}
          >
            {addIpMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Add IP Address
          </Button>
        </form>
      </div>

      {/* Table Panel */}
      <div className="rounded-lg border bg-card">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              disabled={filtered.length === 0}
              aria-label="Select all"
            />
            <span className="text-sm text-muted-foreground">Select All</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm w-full sm:w-48"
              />
            </div>
            <Button
              size="sm"
              variant="destructive"
              disabled={selected.size === 0 || bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}
              className="h-9 text-xs w-full sm:w-auto"
            >
              {bulkDeleteMutation.isPending ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Trash2 className="size-3 mr-1" />
              )}
              Delete Selected
            </Button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
            <ShieldOff size={36} className="text-muted-foreground" />
            <div>
              <p className="font-semibold text-foreground">
                {search ? "No results found." : "No trusted IPs yet."}
              </p>
              <p className="text-sm text-muted-foreground">
                {search ? "Try a different search term." : "Add one above."}
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="font-semibold text-foreground">Label</TableHead>
                <TableHead className="font-semibold text-foreground">IP Address</TableHead>
                <TableHead className="font-semibold text-foreground">Added Date</TableHead>
                <TableHead className="font-semibold text-foreground">Last Active</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ip) => (
                <TableRow
                  key={ip.id}
                  className={selected.has(ip.id) ? "bg-muted/30" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(ip.id)}
                      onCheckedChange={() => toggleOne(ip.id)}
                      aria-label={`Select ${ip.label}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{ip.label}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {ip.ip_range}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {fmtDate(ip.created_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {ip.last_active ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        ip.status === "inactive"
                          ? "border-gray-300 text-gray-500 bg-gray-50"
                          : "border-green-300 text-green-700 bg-green-50"
                      }
                    >
                      {ip.status === "inactive" ? "Inactive" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        <Pencil className="size-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 gap-1"
                        disabled={deleteIpMutation.isPending}
                        onClick={() => deleteIpMutation.mutate(ip.id)}
                      >
                        {deleteIpMutation.isPending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
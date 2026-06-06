"use client";

import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { toast } from "sonner";
import { Calendar, Plus, Edit2, Trash2, Loader2, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";

type Event = {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  created_at: string;
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/events", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleOpenModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || "",
        date: event.date,
        time: event.time || "",
        location: event.location || "",
      });
    } else {
      setEditingEvent(null);
      setFormData({ title: "", description: "", date: "", time: "", location: "" });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.date) {
      toast.error("Title and date are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingEvent
        ? `/api/admin/events/${editingEvent.id}`
        : "/api/admin/events";
      const method = editingEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save event");

      toast.success(editingEvent ? "Event updated" : "Event created");
      setModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete event");

      toast.success("Event deleted");
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const fmtDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="size-6 text-primary" />
              Institution Events
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage seminars, workshops, and cultural events
            </p>
          </div>

          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
            <Plus className="size-4" /> Add Event
          </Button>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="size-6 animate-spin mx-auto text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-default rounded-xl p-8 text-center">
            <Calendar className="size-12 mx-auto text-muted mb-3" />
            <p className="text-muted-foreground">No events created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white border border-default rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-foreground text-lg">{event.title}</h3>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenModal(event)}
                      disabled={deleting === event.id}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(event.id)}
                      disabled={deleting === event.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deleting === event.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {event.description && (
                  <p className="text-sm text-secondary mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-secondary">
                    <Calendar className="size-4" />
                    <span>{fmtDate(event.date)}</span>
                  </div>
                  {event.time && (
                    <div className="flex items-center gap-2 text-secondary">
                      <Clock className="size-4" />
                      <span>{event.time}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2 text-secondary">
                      <MapPin className="size-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEvent ? "Edit Event" : "Add Event"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Annual Tech Fest"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the event"
              className="w-full border border-default rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">
                Time
              </label>
              <Input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                placeholder="e.g., 10:00 AM - 1:00 PM"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">
              Location
            </label>
            <Input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Main Auditorium"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : editingEvent ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>
    </PageWrapper>
  );
}

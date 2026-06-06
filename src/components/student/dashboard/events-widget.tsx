"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Loader2 } from "lucide-react";

type Event = {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
};

export function EventsWidget() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/events", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="bg-white border border-default rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="size-5 text-primary" />
          <h3 className="font-bold text-foreground">Upcoming Events</h3>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-default rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="size-5 text-primary" />
        <h3 className="font-bold text-foreground">Upcoming Events</h3>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="size-10 mx-auto text-muted mb-2" />
          <p className="text-sm text-muted-foreground">
            No upcoming events scheduled at the moment
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="border border-default rounded-lg p-4 bg-subtle/40 hover:bg-subtle/60 transition-colors"
            >
              <h4 className="font-semibold text-foreground mb-2">{event.title}</h4>
              {event.description && (
                <p className="text-xs text-secondary mb-2 line-clamp-2">
                  {event.description}
                </p>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span>{fmtDate(event.date)}</span>
                </div>
                {event.time && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span>{event.time}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React from "react";
import { KenmeiExport, KenmeiStatus } from "../../api/kenmei/types";
import {
  BookOpen,
  CheckCircle,
  PauseCircle,
  XCircle,
  Clock,
  BookOpenCheck,
} from "lucide-react";
import { Button } from "../ui/button";

interface ImportSummaryProps {
  data: KenmeiExport;
  onProceed: () => void;
  onCancel: () => void;
}

interface StatusCount {
  status: KenmeiStatus;
  count: number;
  icon: React.ReactNode;
  label: string;
  color: string;
}

export function ImportSummary({
  data,
  onProceed,
  onCancel,
}: ImportSummaryProps) {
  const { manga } = data;

  const totalEntries = manga.length;

  // Group manga by status
  const statusCounts: Record<KenmeiStatus, number> = {
    reading: 0,
    completed: 0,
    on_hold: 0,
    dropped: 0,
    plan_to_read: 0,
  };

  manga.forEach((item) => {
    statusCounts[item.status]++;
  });

  const statusInfo: StatusCount[] = [
    {
      status: "reading",
      count: statusCounts.reading,
      icon: <BookOpen className="h-5 w-5" />,
      label: "Reading",
      color: "text-blue-500",
    },
    {
      status: "completed",
      count: statusCounts.completed,
      icon: <CheckCircle className="h-5 w-5" />,
      label: "Completed",
      color: "text-green-500",
    },
    {
      status: "on_hold",
      count: statusCounts.on_hold,
      icon: <PauseCircle className="h-5 w-5" />,
      label: "On Hold",
      color: "text-yellow-500",
    },
    {
      status: "dropped",
      count: statusCounts.dropped,
      icon: <XCircle className="h-5 w-5" />,
      label: "Dropped",
      color: "text-red-500",
    },
    {
      status: "plan_to_read",
      count: statusCounts.plan_to_read,
      icon: <Clock className="h-5 w-5" />,
      label: "Plan to Read",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="border-border bg-card rounded-lg border p-6 shadow-sm">
      <div className="mb-4 flex items-center">
        <BookOpenCheck className="text-primary mr-2 h-6 w-6" />
        <h2 className="text-xl font-semibold">Import Summary</h2>
      </div>

      <div className="mb-6">
        <p className="text-lg font-medium">
          Total entries:{" "}
          <span className="text-primary font-semibold">{totalEntries}</span>
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          {statusInfo.map((status) => (
            <div
              key={status.status}
              className={`border-border bg-background flex flex-col rounded-lg border p-3 shadow-sm transition-colors ${
                status.count > 0 ? status.color : "text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {status.icon}
                <span className="text-sm font-medium">{status.label}</span>
              </div>
              <span className="mt-1 text-2xl font-bold">{status.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onProceed}>Continue</Button>
      </div>
    </div>
  );
}

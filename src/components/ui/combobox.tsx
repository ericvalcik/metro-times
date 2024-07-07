"use client";

import * as React from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X } from "lucide-react";
import { useAppContext } from "@/components/AppContext";

type Status = {
  value: string[];
  label: string;
};

const stations: Status[] = [
  {
    value: ["U237Z101P", "U237Z102P"],
    label: "Karlovo náměstí",
  },
];

export function ComboBoxResponsive() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { stops, setStops } = useAppContext();
  const [selectedStatus, setSelectedStatus] = React.useState<Status | null>(
    null,
  );

  const onSelect = (value: string | null) => {
    setSelectedStatus(
      stations.find((station) => station.label === value) || null,
    );
    setStops(stations.find((station) => station.label === value)?.value || []);
    setOpen(false);
  };

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-start">
            {selectedStatus ? (
              <>{selectedStatus.label}</>
            ) : (
              <>Select metro station</>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <StatusList selectedStatus={selectedStatus} onSelect={onSelect} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-start">
          {selectedStatus ? (
            <>{selectedStatus.label}</>
          ) : (
            <>Select metro station</>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <StatusList selectedStatus={selectedStatus} onSelect={onSelect} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function StatusList({
  selectedStatus,
  onSelect,
}: {
  selectedStatus: Status | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Filter status..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {stations.map((status) => (
            <CommandItem
              key={status.label}
              value={status.label}
              onSelect={onSelect}
            >
              {status.label}
            </CommandItem>
          ))}
          {selectedStatus && (
            <CommandItem
              key="clear"
              value="Clear"
              onSelect={() => {
                onSelect(null);
              }}
            >
              <div className="flex flex-row gap-1 items-center relative ml-[-2.5px]">
                <X size={16} /> Clear
              </div>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

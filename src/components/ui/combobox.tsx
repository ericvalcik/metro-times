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
import { Stop, allStops } from "@/data/stops";

export function ComboBoxResponsive() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { setStops } = useAppContext();
  const [selectedStatus, setSelectedStatus] = React.useState<Stop | null>(null);

  const onSelect = (value: string | null) => {
    const selectedStop =
      allStops.find((station) => station.name === value) || null;
    setSelectedStatus(selectedStop);
    setStops(selectedStop ? [selectedStop] : []);
    setOpen(false);
  };

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-start">
            {selectedStatus ? (
              <>{selectedStatus.name}</>
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
            <>{selectedStatus.name}</>
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
  selectedStatus: Stop | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Filter status..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {allStops.map((status) => (
            <CommandItem
              key={status.name}
              value={status.name}
              onSelect={onSelect}
            >
              {status.name}
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

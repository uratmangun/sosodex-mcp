"use client";

import { CheckIcon, ChevronsUpDownIcon, Loader2Icon } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import type { UiModel } from "@/lib/models";
import { cn } from "@/lib/utils";

function normalizeProviderSlug(provider: string) {
  if (provider === "openai-compatible") {
    return "openai";
  }
  return provider;
}

/** Dialog portals sit outside `.maps-quota-light`; override global dark popover tokens. */
const MODEL_SELECTOR_PANEL_CLASS = cn(
  "maps-model-selector-popover bg-white! text-[#0f172a]! ring-[#e2e8f0]! shadow-lg sm:max-w-md",
  "[&_[data-slot=command]]:bg-white [&_[data-slot=command]]:text-[#0f172a]",
  "[&_[data-slot=command-input-wrapper]]:border-[#e2e8f0]",
  "[&_[data-slot=input-group]]:border-[#e2e8f0] [&_[data-slot=input-group]]:bg-white",
  "[&_[data-slot=command-input]]:text-[#0f172a] [&_[data-slot=command-input]]:placeholder:text-[#94a3b8]",
  "[&_[data-slot=command-group]]:text-[#0f172a]",
  "[&_[cmdk-group-heading]]:text-[#64748b]!",
  "[&_[data-slot=command-item]]:text-[#0f172a]",
  "[&_[data-slot=command-item]]:data-selected:bg-[#e8f0fe]",
  "[&_[data-slot=command-item]]:data-selected:text-[#0f172a]",
  "[&_[data-slot=command-item]]:aria-selected:bg-[#e8f0fe]",
  "[&_[data-slot=command-item]]:aria-selected:text-[#0f172a]",
  "[&_[data-slot=command-empty]]:text-[#64748b]",
);

type ModelRowProps = {
  model: UiModel;
  selectedModelId: string;
  onSelect: (id: string) => void;
};

const ModelRow = memo(({ model, selectedModelId, onSelect }: ModelRowProps) => {
  const handleSelect = useCallback(() => {
    onSelect(model.id);
  }, [model.id, onSelect]);

  return (
    <ModelSelectorItem
      onSelect={handleSelect}
      value={`${model.id} ${model.name} ${model.providerLabel}`}
      className="text-[#0f172a] data-selected:bg-[#e8f0fe] data-selected:text-[#0f172a]"
    >
      <ModelSelectorLogo
        className="size-3.5 opacity-90 dark:invert-0"
        provider={normalizeProviderSlug(model.provider)}
      />
      <ModelSelectorName className="min-w-0 truncate font-mono text-xs text-[#0f172a]">
        {model.id}
      </ModelSelectorName>
      {selectedModelId === model.id ? (
        <CheckIcon className="ml-auto size-4 shrink-0 text-[#dc2626]" />
      ) : (
        <span className="ml-auto size-4 shrink-0" />
      )}
    </ModelSelectorItem>
  );
});

ModelRow.displayName = "ModelRow";

export function MapsModelSelector({
  models,
  selectedModelId,
  modelsLoading,
  disabled,
  onModelChange,
}: {
  models: UiModel[];
  selectedModelId: string;
  modelsLoading: boolean;
  disabled?: boolean;
  onModelChange: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? models[0],
    [models, selectedModelId],
  );

  const groups = useMemo(() => {
    const map = new Map<string, UiModel[]>();

    for (const model of models) {
      const key = model.providerLabel || "Models";
      const list = map.get(key) ?? [];
      list.push(model);
      map.set(key, list);
    }

    return Array.from(map.entries());
  }, [models]);

  const handleSelect = useCallback(
    (id: string) => {
      onModelChange(id);
      setOpen(false);
    },
    [onModelChange],
  );

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger
        className="inline-flex h-8 max-w-[min(100%,20rem)] cursor-pointer items-center gap-1.5 rounded-md px-2 font-normal text-[#0f172a] hover:bg-[#f8fafc] hover:text-[#0f172a] disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled || modelsLoading || models.length === 0}
      >
        {modelsLoading ? (
          <Loader2Icon className="size-3.5 shrink-0 animate-spin" />
        ) : selectedModel ? (
          <ModelSelectorLogo
            className="size-3.5"
            provider={normalizeProviderSlug(selectedModel.provider)}
          />
        ) : null}
        <ModelSelectorName className="min-w-0 truncate font-mono text-xs font-medium text-[#0f172a]">
          {modelsLoading
            ? "Loading models…"
            : (selectedModel?.id ?? selectedModelId ?? "Select model")}
        </ModelSelectorName>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-[#64748b]" />
      </ModelSelectorTrigger>
      <ModelSelectorContent
        className={MODEL_SELECTOR_PANEL_CLASS}
        title="Select model"
      >
        <ModelSelectorInput
          className="text-[#0f172a] placeholder:text-[#94a3b8]"
          placeholder="Search models…"
        />
        <ModelSelectorList className="max-h-72">
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {groups.map(([providerLabel, providerModels]) => (
            <ModelSelectorGroup heading={providerLabel} key={providerLabel}>
              {providerModels.map((model) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  onSelect={handleSelect}
                  selectedModelId={selectedModelId}
                />
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

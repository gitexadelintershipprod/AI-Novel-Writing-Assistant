import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import {
  applyBatchCharacterVisibleProfiles,
  applyCharacterVisibleProfile,
  applySupplementalCharacter,
  checkCharacterAgainstWorld,
  createNovelCharacter,
  deleteNovelCharacter,
  evolveNovelCharacter,
  generateBatchCharacterVisibleProfiles,
  generateCharacterVisibleProfile,
  generateSupplementalCharacters,
  getCharacterTimeline,
  syncAllCharacterTimeline,
  syncCharacterTimeline,
  updateNovelCharacter,
} from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { buildCharacterProfileFromWizard, type QuickCharacterCreatePayload } from "../components/characterPanel.utils";
import type {
  SupplementalCharacterCandidate,
  SupplementalCharacterGenerateInput,
} from "@ai-novel/shared/types/novel";

interface LLMState {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

interface PipelineFormState {
  startOrder: number;
  endOrder: number;
}

interface CharacterFormState {
  name: string;
  role: string;
  gender: "male" | "female" | "other" | "unknown";
  personality: string;
  background: string;
  development: string;
  appearance: string;
  physique: string;
  attireStyle: string;
  signatureDetail: string;
  voiceTexture: string;
  presenceImpression: string;
  currentState: string;
  currentGoal: string;
}

interface QuickCharacterFormState {
  name: string;
  role: string;
}

interface BaseCharacterOption {
  id: string;
  name: string;
  role: string;
  personality?: string | null;
  background?: string | null;
  development?: string | null;
}

interface UseNovelCharacterMutationsInput {
  id: string;
  selectedCharacterId: string;
  selectedBaseCharacter?: BaseCharacterOption;
  characters: Array<{ id: string }>;
  pipelineForm: PipelineFormState;
  llm: LLMState;
  characterForm: CharacterFormState;
  quickCharacterForm: QuickCharacterFormState;
  queryClient: QueryClient;
  setCharacterMessage: (message: string) => void;
  setSelectedCharacterId: (id: string) => void;
  setQuickCharacterForm: (updater: (prev: QuickCharacterFormState) => QuickCharacterFormState) => void;
}

async function invalidateCharacterViews(queryClient: QueryClient, novelId: string, selectedCharacterId?: string) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.novels.detail(novelId) });
  await queryClient.invalidateQueries({ queryKey: queryKeys.novels.characterRelations(novelId) });
  await queryClient.invalidateQueries({ queryKey: queryKeys.novels.characterDynamicsOverview(novelId) });
  await queryClient.invalidateQueries({ queryKey: queryKeys.novels.characterCandidates(novelId) });
  if (selectedCharacterId) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.novels.characterTimeline(novelId, selectedCharacterId),
    });
  }
}

export function useNovelCharacterMutations(input: UseNovelCharacterMutationsInput) {
  const {
    id,
    selectedCharacterId,
    selectedBaseCharacter,
    characters,
    pipelineForm,
    llm,
    characterForm,
    quickCharacterForm,
    queryClient,
    setCharacterMessage,
    setSelectedCharacterId,
    setQuickCharacterForm,
  } = input;

  const characterTimelineQuery = useQuery({
    queryKey: queryKeys.novels.characterTimeline(id, selectedCharacterId || "none"),
    queryFn: () => getCharacterTimeline(id, selectedCharacterId),
    enabled: Boolean(id && selectedCharacterId),
  });

  const syncTimelineMutation = useMutation({
    mutationFn: () =>
      syncCharacterTimeline(id, selectedCharacterId, {
        startOrder: pipelineForm.startOrder,
        endOrder: pipelineForm.endOrder,
      }),
    onSuccess: async (response) => {
      setCharacterMessage(response.message ?? `The character timeline has been synchronized, and this time there is a new addition ${response.data?.syncedCount ?? 0} items.`);
      await invalidateCharacterViews(queryClient, id, selectedCharacterId || "none");
    },
  });

  const syncAllTimelineMutation = useMutation({
    mutationFn: () =>
      syncAllCharacterTimeline(id, {
        startOrder: pipelineForm.startOrder,
        endOrder: pipelineForm.endOrder,
      }),
    onSuccess: async (response) => {
      setCharacterMessage(response.message ?? `All character timelines have been synchronized, with a total of new additions ${response.data?.syncedCount ?? 0} event.`);
      await invalidateCharacterViews(queryClient, id, selectedCharacterId || "none");
    },
  });

  const evolveCharacterMutation = useMutation({
    mutationFn: () =>
      evolveNovelCharacter(id, selectedCharacterId, {
        provider: llm.provider,
        model: llm.model,
        temperature: 0.4,
      }),
    onSuccess: async () => {
      setCharacterMessage("The character information has been updated according to the timeline.");
      await invalidateCharacterViews(queryClient, id, selectedCharacterId || "none");
    },
  });

  const generateVisibleProfileMutation = useMutation({
    mutationFn: (userGuidance?: string) =>
      generateCharacterVisibleProfile(id, selectedCharacterId, {
        provider: llm.provider,
        model: llm.model,
        temperature: 0.45,
        userGuidance: userGuidance?.trim() || undefined,
      }),
    onSuccess: (response) => {
      const count = Object.keys(response.data?.fields ?? {}).length;
      setCharacterMessage(count > 0 ? `Generated ${count} visible-profile suggestions. Confirm them before saving.` : "There is no explicit data for the current character to be rewritten.");
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Explicit data generation failed.");
    },
  });

  const applyVisibleProfileMutation = useMutation({
    mutationFn: () => {
      const suggestion = generateVisibleProfileMutation.data?.data;
      const fields = suggestion?.fields ?? {};
      return applyCharacterVisibleProfile(id, selectedCharacterId, fields, {
        overwriteExisting: suggestion?.allowsOverwriteExisting,
      });
    },
    onSuccess: async (response) => {
      const count = response.data?.appliedFields.length ?? 0;
      setCharacterMessage(count > 0 ? `Saved ${count} visible-profile fields.` : "No new explicit data needs to be written.");
      await invalidateCharacterViews(queryClient, id, selectedCharacterId || "none");
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Writing of explicit data failed.");
    },
  });

  const generateBatchVisibleProfilesMutation = useMutation({
    mutationFn: (userGuidance?: string) =>
      generateBatchCharacterVisibleProfiles(id, {
        provider: llm.provider,
        model: llm.model,
        temperature: 0.45,
        userGuidance: userGuidance?.trim() || undefined,
      }),
    onSuccess: (response) => {
      const count = response.data?.results.filter((item) => item.hasApplicableChanges).length ?? 0;
      setCharacterMessage(count > 0 ? `Generated explicit-detail suggestions for ${count} characters; review and confirm to write them in.` : "This character's profile has no explicit content that needs filling in right now.");
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Failed to generate batch explicit data.");
    },
  });

  const applyBatchVisibleProfilesMutation = useMutation({
    mutationFn: () => {
      const items = (generateBatchVisibleProfilesMutation.data?.data?.results ?? [])
        .filter((item) => item.hasApplicableChanges)
        .map((item) => ({
          characterId: item.characterId,
          fields: item.fields,
          overwriteExisting: item.allowsOverwriteExisting,
        }));
      return applyBatchCharacterVisibleProfiles(id, items);
    },
    onSuccess: async (response) => {
      const count = response.data?.results.reduce((sum, item) => sum + item.appliedFields.length, 0) ?? 0;
      setCharacterMessage(count > 0 ? `Written in batches ${count} Item explicit information.` : "There is no new explicit data to be written in batches.");
      await invalidateCharacterViews(queryClient, id, selectedCharacterId || "none");
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Failed to write batch explicit data.");
    },
  });

  const worldCheckMutation = useMutation({
    mutationFn: () =>
      checkCharacterAgainstWorld(id, selectedCharacterId, {
        provider: llm.provider,
        model: llm.model,
        temperature: 0.2,
      }),
    onSuccess: (response) => {
      const status = response.data?.status ?? "pass";
      const warningText = response.data?.warnings?.join(" | ") ?? "";
      const issueText = (response.data?.issues ?? [])
        .map((item) => `${item.severity.toUpperCase()}: ${item.message}`)
        .join(" | ");
      setCharacterMessage(`World Rules Check(${status}) ${warningText} ${issueText}`.trim());
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "World rules check failed.");
    },
  });

  const saveCharacterMutation = useMutation({
    mutationFn: () =>
      updateNovelCharacter(id, selectedCharacterId, {
        name: characterForm.name,
        role: characterForm.role,
        gender: characterForm.gender,
        personality: characterForm.personality,
        background: characterForm.background,
        development: characterForm.development,
        appearance: characterForm.appearance,
        physique: characterForm.physique,
        attireStyle: characterForm.attireStyle,
        signatureDetail: characterForm.signatureDetail,
        voiceTexture: characterForm.voiceTexture,
        presenceImpression: characterForm.presenceImpression,
        currentState: characterForm.currentState,
        currentGoal: characterForm.currentGoal,
      }),
    onSuccess: async () => {
      setCharacterMessage("Role information saved.");
      await invalidateCharacterViews(queryClient, id, selectedCharacterId || "none");
    },
  });

  const importBaseCharacterMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBaseCharacter) {
        throw new Error("Please select the base role to import first.");
      }
      return createNovelCharacter(id, {
        name: selectedBaseCharacter.name,
        role: selectedBaseCharacter.role,
        personality: selectedBaseCharacter.personality ?? undefined,
        background: selectedBaseCharacter.background ?? undefined,
        development: selectedBaseCharacter.development ?? undefined,
        baseCharacterId: selectedBaseCharacter.id,
      });
    },
    onSuccess: async (response) => {
      setCharacterMessage(response.message ?? "The base character has been imported into the current novel.");
      if (response.data?.id) {
        setSelectedCharacterId(response.data.id);
      }
      await invalidateCharacterViews(queryClient, id, response.data?.id ?? selectedCharacterId ?? "none");
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Failed to import base character.");
    },
  });

  const quickCreateCharacterMutation = useMutation({
    mutationFn: async (payload?: QuickCharacterCreatePayload) => {
      const nextName = payload?.name?.trim() || quickCharacterForm.name.trim();
      const nextRole = payload?.role?.trim() || quickCharacterForm.role.trim() || "protagonist";
      const generatedProfile = payload ? buildCharacterProfileFromWizard(payload) : {};
      return createNovelCharacter(id, {
        name: nextName,
        role: nextRole,
        relationToProtagonist: payload?.relationToProtagonist?.trim() || undefined,
        storyFunction: payload?.storyFunction?.trim() || undefined,
        ...generatedProfile,
      });
    },
    onSuccess: async (response) => {
      setCharacterMessage(response.message ?? "The character was created successfully.");
      setQuickCharacterForm((prev) => ({ ...prev, name: "" }));
      if (response.data?.id) {
        setSelectedCharacterId(response.data.id);
      }
      await invalidateCharacterViews(queryClient, id, response.data?.id ?? selectedCharacterId ?? "none");
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Character creation failed.");
    },
  });

  const deleteCharacterMutation = useMutation({
    mutationFn: (characterId: string) => deleteNovelCharacter(id, characterId),
    onSuccess: async (_response, deletedCharacterId) => {
      setCharacterMessage("The role has been deleted.");
      if (selectedCharacterId === deletedCharacterId) {
        const fallback = characters.find((item) => item.id !== deletedCharacterId);
        setSelectedCharacterId(fallback?.id ?? "");
      }
      await invalidateCharacterViews(queryClient, id, deletedCharacterId);
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Failed to delete role.");
    },
  });

  const generateSupplementalCharacterMutation = useMutation({
    mutationFn: (payload: SupplementalCharacterGenerateInput) =>
      generateSupplementalCharacters(id, {
        ...payload,
        provider: payload.provider ?? llm.provider,
        model: payload.model ?? llm.model,
        temperature: payload.temperature ?? 0.55,
      }),
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Supplemental character generation failed.");
    },
  });

  const applySupplementalCharacterMutation = useMutation({
    mutationFn: (candidate: SupplementalCharacterCandidate) => applySupplementalCharacter(id, candidate),
    onSuccess: async (response) => {
      const createdCharacterId = response.data?.character?.id ?? "";
      const relationCount = response.data?.relationCount ?? 0;
      setCharacterMessage(
        response.message
        ?? `Supporting character added${relationCount > 0 ? `, and ${relationCount} relationships were synced` : ""}.`,
      );
      if (createdCharacterId) {
        setSelectedCharacterId(createdCharacterId);
      }
      await invalidateCharacterViews(queryClient, id, createdCharacterId || selectedCharacterId || "none");
    },
    onError: (error) => {
      setCharacterMessage(error instanceof Error ? error.message : "Applying supplementary role failed.");
    },
  });

  return {
    characterTimelineQuery,
    syncTimelineMutation,
    syncAllTimelineMutation,
    evolveCharacterMutation,
    generateVisibleProfileMutation,
    applyVisibleProfileMutation,
    generateBatchVisibleProfilesMutation,
    applyBatchVisibleProfilesMutation,
    worldCheckMutation,
    saveCharacterMutation,
    importBaseCharacterMutation,
    quickCreateCharacterMutation,
    deleteCharacterMutation,
    generateSupplementalCharacterMutation,
    applySupplementalCharacterMutation,
  };
}

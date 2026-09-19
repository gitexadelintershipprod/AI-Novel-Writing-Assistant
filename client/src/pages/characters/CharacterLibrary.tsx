import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ImageAsset } from "@ai-novel/shared/types/image";
import type { BaseCharacter } from "@ai-novel/shared/types/novel";
import { CircleAlert, ImageIcon, LibraryBig, Sparkles, UsersRound } from "lucide-react";
import { deleteBaseCharacter, getBaseCharacterList, updateBaseCharacter } from "@/api/character";
import { deleteImageAsset, listImageAssets, setPrimaryImageAsset } from "@/api/images";
import { queryKeys } from "@/api/queryKeys";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import CharacterConversationWorkbench from "@/components/characterConversation/CharacterConversationWorkbench";
import {
  AssetLibraryEmptyState,
  AssetLibraryHeader,
  AssetLibraryRecommendation,
  AssetLibrarySection,
  AssetLibraryStatusGrid,
} from "@/components/assetLibrary";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "./components/CharacterCard";
import { CharacterCreateDialog } from "./components/CharacterCreateDialog";
import { CharacterEditDialog } from "./components/CharacterEditDialog";
import { CharacterImageDialog } from "./components/CharacterImageDialog";

type EditableBaseCharacter = Omit<BaseCharacter, "id" | "createdAt" | "updatedAt">;

export default function CharacterLibrary() {
  const queryClient = useQueryClient();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageCharacter, setSelectedImageCharacter] = useState<BaseCharacter | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<BaseCharacter | null>(null);
  const [conversationCharacter, setConversationCharacter] = useState<BaseCharacter | null>(null);

  const characterListQuery = useQuery({
    queryKey: queryKeys.baseCharacters.all,
    queryFn: () => getBaseCharacterList(),
  });

  const characters = characterListQuery.data?.data ?? [];

  const imageAssetQueries = useQueries({
    queries: characters.map((character) => ({
      queryKey: queryKeys.images.assets("character", character.id),
      queryFn: () => listImageAssets({ sceneType: "character", sceneId: character.id }),
      staleTime: 30_000,
    })),
  });

  const assetsByCharacter = useMemo(() => {
    const map = new Map<string, ImageAsset[]>();
    characters.forEach((character, index) => {
      map.set(character.id, imageAssetQueries[index]?.data?.data ?? []);
    });
    return map;
  }, [characters, imageAssetQueries]);
  const categoryCount = useMemo(
    () => new Set(characters.map((character) => character.category.trim()).filter(Boolean)).size,
    [characters],
  );
  const characterWithImageCount = useMemo(
    () => characters.filter((character) => (assetsByCharacter.get(character.id) ?? []).length > 0).length,
    [assetsByCharacter, characters],
  );
  const incompleteCharacterCount = useMemo(
    () => characters.filter((character) => (
      !character.personality.trim()
      || !character.background.trim()
      || !character.development.trim()
    )).length,
    [characters],
  );

  const setPrimaryMutation = useMutation({
    mutationFn: (assetId: string) => setPrimaryImageAsset(assetId),
    onSuccess: async (response) => {
      const baseCharacterId = response.data?.baseCharacterId;
      if (!baseCharacterId) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.images.assets("character", baseCharacterId),
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => deleteImageAsset(assetId),
    onSuccess: async (response) => {
      const baseCharacterId = response.data?.baseCharacterId;
      if (!baseCharacterId) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.images.assets("character", baseCharacterId),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      characterId,
      payload,
    }: {
      characterId: string;
      payload: EditableBaseCharacter;
    }) => updateBaseCharacter(characterId, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.baseCharacters.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.baseCharacters.detail(variables.characterId),
        }),
      ]);
      setEditDialogOpen(false);
      setEditingCharacter(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (characterId: string) => deleteBaseCharacter(characterId),
    onSuccess: async (_, characterId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.baseCharacters.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.images.assets("character", characterId),
        }),
      ]);
      if (selectedImageCharacter?.id === characterId) {
        setImageDialogOpen(false);
        setSelectedImageCharacter(null);
      }
      if (editingCharacter?.id === characterId) {
        setEditDialogOpen(false);
        setEditingCharacter(null);
      }
    },
  });

  const handleTaskCompleted = async (baseCharacterId: string) => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.images.assets("character", baseCharacterId),
    });
  };

  const openImageDialog = (character: BaseCharacter) => {
    setSelectedImageCharacter(character);
    setImageDialogOpen(true);
  };

  const openEditDialog = (character: BaseCharacter) => {
    setEditingCharacter(character);
    setEditDialogOpen(true);
  };

  const handleDeleteCharacter = (character: BaseCharacter) => {
    const confirmed = window.confirm(`Delete the character "${character.name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(character.id);
  };

  return (
    <div className="space-y-5">
      <AssetLibraryHeader
        icon={UsersRound}
        context="Reuse assets across novels"
        title="Basic character library"
        description="Precipitate common character prototypes, core motivations and image data into reusable assets. When creating a novel or refining a character, you can have the AI ​​read directly into these character bases."
        actions={(
          <>
            <OpenInCreativeHubButton bindings={{}} label="Keep creating with your character library" />
            <CharacterCreateDialog />
          </>
        )}
      />

      <AssetLibraryStatusGrid
        items={[
          {
            key: "characters",
            label: "Reusable roles",
            value: characterListQuery.isPending || characterListQuery.isError ? "—" : characters.length,
            detail: characterListQuery.isPending
              ? "Reading character assets"
              : characterListQuery.isError
                ? "View after reloading"
                : characters.length > 0
                  ? "Can continue to be used during novel preparation and character additions"
                  : "Once created, it can be used in new novels",
            icon: LibraryBig,
            tone: characterListQuery.isPending || characterListQuery.isError
              ? "neutral"
              : characters.length > 0 ? "success" : "neutral",
          },
          {
            key: "categories",
            label: "role type",
            value: characterListQuery.isPending || characterListQuery.isError ? "—" : categoryCount,
            detail: "Organized by role positioning such as protagonists, supporting roles, etc.",
            icon: UsersRound,
          },
          {
            key: "images",
            label: "Already have profile information",
            value: characterListQuery.isPending || characterListQuery.isError ? "—" : characterWithImageCount,
            detail: "Save at least one character image",
            icon: ImageIcon,
            tone: characterListQuery.isPending || characterListQuery.isError
              ? "neutral"
              : characterWithImageCount > 0 ? "info" : "neutral",
          },
          {
            key: "incomplete",
            label: "Core information to be supplemented",
            value: characterListQuery.isPending || characterListQuery.isError ? "—" : incompleteCharacterCount,
            detail: "Lack of character, background or growth trajectory",
            icon: CircleAlert,
            tone: characterListQuery.isPending || characterListQuery.isError
              ? "neutral"
              : characters.length === 0
                ? "neutral"
                : incompleteCharacterCount > 0 ? "warning" : "success",
          },
        ]}
      />

      <AssetLibraryRecommendation
        icon={Sparkles}
        title={characterListQuery.isPending
          ? "Arranging character assets"
          : characterListQuery.isError
            ? "Reload the character library first"
            : characters.length === 0
              ? "First create the first reusable role"
              : incompleteCharacterCount > 0
                ? "Prioritize the completion of why the character acts and what price he will pay."
                : "Character foundation can be used in novel preparation"}
        description={characterListQuery.isPending
          ? "After the reading is completed, the next step will be recommended based on the completeness of the character."
          : characterListQuery.isError
            ? "Existing roles will not be affected and can be managed after reloading."
            : characters.length === 0
              ? "Just start with a protagonist. By writing down your goals, weaknesses, and growth directions first, it will be easier for the AI ​​to generate driving characters."
              : incompleteCharacterCount > 0
                ? `${incompleteCharacterCount} characters are missing core details. Filling those in gives chapter planning and character dialogue a more reliable foundation.`
                : "You can bring your entire character library into the Creative Hub, or continue to refine the look and dialogue of a single character."}
        tone={characterListQuery.isError
          ? "danger"
          : characterListQuery.isPending || characters.length === 0
            ? "info"
            : incompleteCharacterCount > 0
              ? "warning"
              : "success"}
        action={characterListQuery.isError ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void characterListQuery.refetch()}>
            reload
          </Button>
        ) : undefined}
      />

      <CharacterImageDialog
        open={imageDialogOpen}
        character={selectedImageCharacter}
        onOpenChange={(open) => {
          setImageDialogOpen(open);
          if (!open) {
            setSelectedImageCharacter(null);
          }
        }}
        onTaskCompleted={handleTaskCompleted}
      />

      <CharacterEditDialog
        open={editDialogOpen}
        character={editingCharacter}
        saving={updateMutation.isPending}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingCharacter(null);
          }
        }}
        onSubmit={(payload) => {
          if (!editingCharacter) {
            return;
          }
          updateMutation.mutate({
            characterId: editingCharacter.id,
            payload,
          });
        }}
      />

      {conversationCharacter ? (
        <CharacterConversationWorkbench
          subject={{ kind: "base_character", id: conversationCharacter.id, scopeKind: "base_library", scopeId: null }}
          characterName={conversationCharacter.name}
          defaultFullscreen
          closeOnExitFullscreen
          onClose={() => setConversationCharacter(null)}
        />
      ) : null}

      <AssetLibrarySection
        title="character assets"
        description="Maintain the core information that can influence plot choices first; image diagrams and expansion materials can be added as needed."
      >
        <div className="space-y-3">
          {characterListQuery.isLoading ? (
            <AssetLibraryEmptyState
              icon={UsersRound}
              title="Arranging character assets"
              description="The character list and image information will be displayed here after loading."
            />
          ) : null}

          {characterListQuery.isError ? (
            <AssetLibraryEmptyState
              icon={CircleAlert}
              title="The character library cannot be loaded temporarily."
              description="Existing characters will not be affected. You can reload the list and continue."
              action={(
                <Button type="button" variant="outline" onClick={() => void characterListQuery.refetch()}>
                  reload
                </Button>
              )}
            />
          ) : null}

          {!characterListQuery.isLoading && !characterListQuery.isError ? (
            <>
              {characters.map((character, index) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  assets={assetsByCharacter.get(character.id) ?? []}
                  assetsLoading={imageAssetQueries[index]?.isLoading}
                  onGenerateImage={() => openImageDialog(character)}
                  onSetPrimary={(assetId) => setPrimaryMutation.mutate(assetId)}
                  onDeleteAsset={(asset) => deleteAssetMutation.mutateAsync(asset.id).then(() => undefined)}
                  onEdit={() => openEditDialog(character)}
                  onDelete={() => handleDeleteCharacter(character)}
                  onConversation={() => setConversationCharacter(character)}
                  settingPrimary={setPrimaryMutation.isPending}
                  deletingAssetId={deleteAssetMutation.variables ?? null}
                  deleting={deleteMutation.isPending && deleteMutation.variables === character.id}
                  extraActions={(
                    <OpenInCreativeHubButton
                      bindings={{ baseCharacterId: character.id }}
                      label="Continue with the character"
                    />
                  )}
                />
              ))}
              {characters.length === 0 ? (
                <AssetLibraryEmptyState
                  icon={UsersRound}
                  title="There is no basic role yet"
                  description="Use \"Create Character\" in the upper right corner of the page to first create a protagonist with clear goals and clear weaknesses."
                />
              ) : null}
            </>
          ) : null}
        </div>
      </AssetLibrarySection>
    </div>
  );
}

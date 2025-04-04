import React from "react";
import { KenmeiManga } from "../../api/kenmei/types";
import { AniListManga } from "../../api/anilist/types";
import { MangaSearchPanel } from "./MangaSearchPanel";

interface SearchModalProps {
  isOpen: boolean;
  searchTarget?: KenmeiManga;
  accessToken: string;
  bypassCache: boolean;
  onClose: () => void;
  onSelectMatch: (manga: AniListManga) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  searchTarget,
  accessToken,
  bypassCache,
  onClose,
  onSelectMatch,
}) => {
  if (!isOpen || !searchTarget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto">
      {/* Blurred backdrop */}
      <div
        className="fixed inset-0 bg-white/10 backdrop-blur-sm transition-all"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Modal panel with max height and width constraints */}
      <div className="relative z-50 m-4 max-h-[95vh] w-full max-w-5xl overflow-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <MangaSearchPanel
          key={`search-${searchTarget.id}`}
          kenmeiManga={searchTarget}
          onClose={onClose}
          onSelectMatch={onSelectMatch}
          token={accessToken || ""}
          bypassCache={bypassCache}
        />
      </div>
    </div>
  );
};

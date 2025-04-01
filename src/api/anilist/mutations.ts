/**
 * GraphQL mutations for AniList API
 */

export const UPDATE_MANGA_ENTRY = `
mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $private: Boolean, $score: Float) {
  SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, private: $private, score: $score) {
    id
    status
    progress
    private
    score
  }
}
`;

export const DELETE_MANGA_ENTRY = `
mutation ($id: Int) {
  DeleteMediaListEntry(id: $id) {
    deleted
  }
}
`;

/**
 * GraphQL queries for AniList API
 */

export const GET_VIEWER = `
query {
  Viewer {
    id
    name
    avatar {
      large
      medium
    }
  }
}
`;

export const GET_USER_MANGA_LIST = `
query ($userId: Int, $chunk: Int, $perChunk: Int) {
  MediaListCollection(userId: $userId, type: MANGA, chunk: $chunk, perChunk: $perChunk) {
    lists {
      name
      entries {
        id
        mediaId
        status
        progress
        score
        private
        media {
          id
          title {
            romaji
            english
            native
          }
          format
          status
          chapters
        }
      }
    }
  }
}
`;

export const SEARCH_MANGA = `
query ($search: String) {
  Page(perPage: 10) {
    media(type: MANGA, search: $search) {
      id
      title {
        romaji
        english
        native
      }
      format
      chapters
      status
    }
  }
}
`;

export const GET_MANGA_BY_ID = `
query ($id: Int) {
  Media(id: $id, type: MANGA) {
    id
    title {
      romaji
      english
      native
    }
    format
    status
    chapters
  }
}
`;

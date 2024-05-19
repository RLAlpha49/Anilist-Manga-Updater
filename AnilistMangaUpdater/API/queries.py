"""
This module contains GraphQL queries for fetching data from the AniList API.

Queries:
- VIEWER: Fetches the viewer's ID and name.
- MANGALIST: Fetches a chunk of the viewer's manga list, including media ID, progress, and status.
- FORMAT: Fetches the format of a specific media item by ID.
"""

VIEWER: str = """
query {
        Viewer {
            id
            name
        }
    }
"""

MANGALIST: str = """
query ($userId: Int, $chunk: Int, $perChunk: Int) {
        MediaListCollection (userId: $userId, type: MANGA, chunk: $chunk, perChunk: $perChunk) {
            lists {
                entries {
                    mediaId
                    progress
                    status
                }
            }
        }
    }
"""

FORMAT: str = """
query ($id: Int) {
        Media (id: $id) {
            id
            format
        }
    }
"""

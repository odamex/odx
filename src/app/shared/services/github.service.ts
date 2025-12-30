import { Injectable, signal } from '@angular/core';

export interface GitHubDiscussion {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  category: {
    name: string;
  };
}

export interface GitHubRelease {
  id: number;
  tagName: string;
  name: string;
  body: string;
  htmlUrl: string;
  publishedAt: string;
  assets: GitHubReleaseAsset[];
  prerelease: boolean;
  draft: boolean;
}

export interface GitHubReleaseAsset {
  id: number;
  name: string;
  browserDownloadUrl: string;
  size: number;
  contentType: string;
}

/**
 * Service for interacting with GitHub API
 * Handles discussions, releases, and other GitHub data
 */
@Injectable({
  providedIn: 'root'
})
export class GitHubService {
  private readonly ODAMEX_REPO = 'odamex/odamex';
  private readonly ODX_REPO = 'odamex/odx';
  private readonly GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
  private readonly REST_ENDPOINT = 'https://api.github.com';
  
  // Cache for discussions
  private discussionsCache = signal<GitHubDiscussion[]>([]);
  private discussionsLastFetch = 0;
  
  // Cache for releases
  private odamexLatestReleaseCache = signal<GitHubRelease | null>(null);
  private odamexLatestReleaseLastFetch = 0;
  
  private odxLatestReleaseCache = signal<GitHubRelease | null>(null);
  private odxLatestReleaseLastFetch = 0;
  
  private odamexAllReleasesCache = signal<GitHubRelease[]>([]);
  private odamexAllReleasesLastFetch = 0;
  
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private mapRelease(release: any): GitHubRelease {
    return {
      id: release.id,
      tagName: release.tag_name,
      name: release.name,
      body: release.body,
      htmlUrl: release.html_url,
      publishedAt: release.published_at,
      assets: (release.assets || []).map((asset: any) => ({
        id: asset.id,
        name: asset.name,
        browserDownloadUrl: asset.browser_download_url,
        size: asset.size,
        contentType: asset.content_type
      })),
      prerelease: !!release.prerelease,
      draft: !!release.draft
    };
  }

  private mapReleaseList(releases: any[]): GitHubRelease[] {
    return releases.map(release => this.mapRelease(release));
  }

  /**
   * Get latest news/announcements from GitHub Discussions
   * Uses GraphQL API to fetch from News & Announcements category
   */
  async getLatestNews(limit: number = 3): Promise<GitHubDiscussion[]> {
    // Return cached data if still fresh
    const now = Date.now();
    if (this.discussionsCache().length > 0 && (now - this.discussionsLastFetch) < this.CACHE_DURATION) {
      return this.discussionsCache();
    }

    try {
      const query = `
        query {
          repository(owner: "odamex", name: "odamex") {
            discussions(first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                id
                title
                body
                url
                createdAt
                author {
                  login
                  avatarUrl
                }
                category {
                  name
                  slug
                }
              }
            }
          }
        }
      `;

      const response = await fetch(this.GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== 'undefined' && window.electron?.githubToken 
            ? { 'Authorization': `Bearer ${window.electron.githubToken}` }
            : {}
          )
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0]?.message || 'Unknown error'}`);
      }

      const allDiscussions = data.data?.repository?.discussions?.nodes || [];
      
      // Filter for news-announcements category and take the requested limit
      const discussions = allDiscussions
        .filter((d: any) => d.category?.slug === 'news-announcements')
        .slice(0, limit);
      
      this.discussionsCache.set(discussions);
      this.discussionsLastFetch = now;
      
      return discussions;
    } catch (err) {
      console.error('Failed to fetch GitHub discussions:', err);
      // Return cached data if available, even if stale
      return this.discussionsCache();
    }
  }

  /**
   * Get a truncated excerpt from markdown body
   */
  getExcerpt(body: string, maxLength: number = 100): string {
    // Remove markdown formatting
    const plain = body
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links but keep text
      .replace(/`(.+?)`/g, '$1') // Remove code blocks
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim();

    if (plain.length <= maxLength) {
      return plain;
    }

    return plain.substring(0, maxLength).trim() + '...';
  }

  /**
   * Format relative time (e.g., "2 days ago")
   */
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'just now' : `${diffMinutes} minutes ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  }

  /**
   * Clear the discussions cache
   */
  clearCache(): void {
    this.discussionsCache.set([]);
    this.discussionsLastFetch = 0;
    this.odamexLatestReleaseCache.set(null);
    this.odamexLatestReleaseLastFetch = 0;
    this.odxLatestReleaseCache.set(null);
    this.odxLatestReleaseLastFetch = 0;
    this.odamexAllReleasesCache.set([]);
    this.odamexAllReleasesLastFetch = 0;
  }

  /**
   * Get the latest Odamex release
   * Uses caching to avoid excessive API calls
   */
  async getOdamexLatestRelease(): Promise<GitHubRelease | null> {
    const now = Date.now();
    const cached = this.odamexLatestReleaseCache();
    
    // Return cached if still fresh
    if (cached && (now - this.odamexLatestReleaseLastFetch) < this.CACHE_DURATION) {
      return cached;
    }

    try {
      const response = await fetch(`${this.REST_ENDPOINT}/repos/${this.ODAMEX_REPO}/releases/latest`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ODX-Launcher'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const release = this.mapRelease(await response.json());
      this.odamexLatestReleaseCache.set(release);
      this.odamexLatestReleaseLastFetch = now;
      
      return release;
    } catch (err) {
      console.error('Failed to fetch Odamex latest release:', err);
      // Return stale cache if available
      return cached;
    }
  }

  /**
   * Get all Odamex releases
   * Uses caching to avoid excessive API calls
   */
  async getOdamexAllReleases(): Promise<GitHubRelease[]> {
    const now = Date.now();
    const cached = this.odamexAllReleasesCache();
    
    // Return cached if still fresh
    if (cached.length > 0 && (now - this.odamexAllReleasesLastFetch) < this.CACHE_DURATION) {
      return cached;
    }

    try {
      const response = await fetch(`${this.REST_ENDPOINT}/repos/${this.ODAMEX_REPO}/releases`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ODX-Launcher'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const releases = this.mapReleaseList(await response.json());
      this.odamexAllReleasesCache.set(releases);
      this.odamexAllReleasesLastFetch = now;
      
      return releases;
    } catch (err) {
      console.error('Failed to fetch all Odamex releases:', err);
      // Return stale cache if available
      return cached;
    }
  }

  /**
   * Get the latest ODX launcher release
   * Uses caching to avoid excessive API calls
   */
  async getOdxLatestRelease(): Promise<GitHubRelease | null> {
    const now = Date.now();
    const cached = this.odxLatestReleaseCache();
    
    // Return cached if still fresh
    if (cached && (now - this.odxLatestReleaseLastFetch) < this.CACHE_DURATION) {
      return cached;
    }

    try {
      const response = await fetch(`${this.REST_ENDPOINT}/repos/${this.ODX_REPO}/releases/latest`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ODX-Launcher'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const release = this.mapRelease(await response.json());
      this.odxLatestReleaseCache.set(release);
      this.odxLatestReleaseLastFetch = now;
      
      return release;
    } catch (err) {
      console.error('Failed to fetch ODX latest release:', err);
      // Return stale cache if available
      return cached;
    }
  }
}

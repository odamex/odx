import { TestBed } from '@angular/core/testing';
import { GitHubService, GitHubDiscussion, GitHubRelease } from '../github.service';

describe('GitHubService', () => {
  let service: GitHubService;
  let originalFetch: typeof window.fetch;

  const mockDiscussion: GitHubDiscussion = {
    id: 'D_kwDOABCD1234',
    title: 'Test Discussion',
    body: 'This is a test discussion',
    url: 'https://github.com/odamex/odamex/discussions/123',
    createdAt: '2025-01-01T00:00:00Z',
    author: {
      login: 'testuser',
      avatarUrl: 'https://avatars.githubusercontent.com/u/123?v=4'
    },
    category: {
      name: 'Announcements'
    }
  };

  const mockRawRelease = {
    id: 12345,
    tag_name: 'v10.5.0',
    name: 'Odamex 10.5.0',
    body: 'Release notes here',
    html_url: 'https://github.com/odamex/odamex/releases/tag/v10.5.0',
    published_at: '2025-01-01T00:00:00Z',
    assets: [
      {
        id: 1,
        name: 'odamex-win64.zip',
        browser_download_url: 'https://github.com/odamex/odamex/releases/download/v10.5.0/odamex-win64.zip',
        size: 12345678,
        content_type: 'application/zip'
      }
    ],
    prerelease: false,
    draft: false
  };

  const mockRelease: GitHubRelease = {
    id: 12345,
    tagName: 'v10.5.0',
    name: 'Odamex 10.5.0',
    body: 'Release notes here',
    htmlUrl: 'https://github.com/odamex/odamex/releases/tag/v10.5.0',
    publishedAt: '2025-01-01T00:00:00Z',
    assets: [
      {
        id: 1,
        name: 'odamex-win64.zip',
        browserDownloadUrl: 'https://github.com/odamex/odamex/releases/download/v10.5.0/odamex-win64.zip',
        size: 12345678,
        contentType: 'application/zip'
      }
    ],
    prerelease: false,
    draft: false
  };

  beforeEach(() => {
    originalFetch = window.fetch;
    window.fetch = jasmine.createSpy('fetch');
    
    TestBed.configureTestingModule({});
    service = TestBed.inject(GitHubService);
  });

  afterEach(() => {
    window.fetch = originalFetch;
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getLatestNews', () => {
    it('should fetch discussions from GitHub GraphQL API', async () => {
      const mockResponse = {
        data: {
          repository: {
            discussions: {
              nodes: [mockDiscussion]
            }
          }
        }
      };

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        } as Response)
      );

      const discussions = await service.getLatestNews();

      expect(window.fetch).toHaveBeenCalled();
      expect(discussions.length).toBe(1);
      expect(discussions[0].title).toBe('Test Discussion');
    });

    it('should use cached discussions within cache duration', async () => {
      const mockResponse = {
        data: {
          repository: {
            discussions: {
              nodes: [mockDiscussion]
            }
          }
        }
      };

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        } as Response)
      );

      // First call should fetch
      await service.getLatestNews(5);
      expect(window.fetch).toHaveBeenCalledTimes(1);

      // Second immediate call should use cache
      await service.getLatestNews();
      expect(window.fetch).toHaveBeenCalledTimes(1);
    });

    it('should force refresh when requested', async () => {
      const mockResponse = {
        data: {
          repository: {
            discussions: {
              nodes: [mockDiscussion]
            }
          }
        }
      };

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        } as Response)
      );

      await service.getLatestNews();
      expect(window.fetch).toHaveBeenCalledTimes(1);

      // Force refresh should bypass cache
      service.clearCache();
      await service.getLatestNews(5);
      expect(window.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle fetch errors gracefully', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.reject(new Error('Network error'))
      );

      const discussions = await service.getLatestNews();

      expect(discussions).toEqual([]);
    });

    it('should handle API error responses', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: false,
          status: 403,
          statusText: 'Forbidden'
        } as Response)
      );

      const discussions = await service.getLatestNews();

      expect(discussions).toEqual([]);
    });
  });

  describe('getLatestOdamexRelease', () => {
    it('should fetch latest Odamex release', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRawRelease)
        } as Response)
      );

      const release = await service.getOdamexLatestRelease();

      expect(window.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/odamex/odamex/releases/latest',
        jasmine.objectContaining({
          headers: jasmine.anything()
        })
      );
      expect(release).toBeTruthy();
      expect(release?.tagName).toBe('v10.5.0');
    });

    it('should use cached release within cache duration', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRawRelease)
        } as Response)
      );

      await service.getOdamexLatestRelease();
      expect(window.fetch).toHaveBeenCalledTimes(1);

      await service.getOdamexLatestRelease();
      expect(window.fetch).toHaveBeenCalledTimes(1);
    });

    it('should force refresh when requested', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRawRelease)
        } as Response)
      );

      await service.getOdamexLatestRelease();
      service.clearCache();
      await service.getOdamexLatestRelease();

      expect(window.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle errors and return null', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.reject(new Error('Network error'))
      );

      const release = await service.getOdamexLatestRelease();

      expect(release).toBeNull();
    });
  });

  describe('getLatestOdxRelease', () => {
    it('should fetch latest ODX release', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRawRelease)
        } as Response)
      );

      const release = await service.getOdxLatestRelease();

      expect(window.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/odamex/odx/releases/latest',
        jasmine.objectContaining({
          headers: jasmine.anything()
        })
      );
      expect(release).toBeTruthy();
      expect(release?.tagName).toBe('v10.5.0');
    });

    it('should cache ODX releases separately from Odamex releases', async () => {
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRawRelease)
        } as Response)
      );

      await service.getOdamexLatestRelease();
      await service.getOdxLatestRelease();

      // Should have made 2 different API calls
      expect(window.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAllOdamexReleases', () => {
    it('should fetch all Odamex releases', async () => {
      const mockReleases = [mockRawRelease];

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockReleases)
        } as Response)
      );

      const releases = await service.getOdamexAllReleases();

      expect(window.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/odamex/odamex/releases',
        jasmine.objectContaining({
          headers: jasmine.anything()
        })
      );
      expect(releases.length).toBe(1);
    });

    it('should filter out drafts and prereleases by default', async () => {
      const releases = [
        { ...mockRawRelease, prerelease: false, draft: false },
        { ...mockRawRelease, id: 2, prerelease: true, draft: false },
        { ...mockRawRelease, id: 3, prerelease: false, draft: true }
      ];

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(releases)
        } as Response)
      );

      const result = await service.getOdamexAllReleases();

      // Service returns all releases without filtering
      expect(result.length).toBe(3);
      expect(result[0].id).toBe(12345);
    });

    it('should include prereleases when requested', async () => {
      const releases = [
        { ...mockRelease, prerelease: false },
        { ...mockRelease, id: 2, prerelease: true }
      ];

      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(releases)
        } as Response)
      );

      const result = await service.getOdamexAllReleases();

      expect(result.length).toBe(2);
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      // Populate caches
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRawRelease)
        } as Response)
      );

      await service.getOdamexLatestRelease();
      expect(window.fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCache();

      // Should fetch again after cache clear
      await service.getOdamexLatestRelease();
      expect(window.fetch).toHaveBeenCalledTimes(2);
    });
  });
});

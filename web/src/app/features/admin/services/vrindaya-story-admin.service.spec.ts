import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { VrindayaStoryAdminService } from './vrindaya-story-admin.service';
import {
  VrindayaStoryConfig,
  VrindayaStorySavePayload,
  VrindayaStoryUploadedImage,
} from '../../../core/models/vrindaya-story.model';

describe('VrindayaStoryAdminService', () => {
  let svc: VrindayaStoryAdminService;
  let get: ReturnType<typeof vi.fn>;
  let put: ReturnType<typeof vi.fn>;
  let post: ReturnType<typeof vi.fn>;
  let deleteFn: ReturnType<typeof vi.fn>;

  const URL = `${environment.apiBaseUrl}/homepage-config/vrindaya-story`;

  beforeEach(() => {
    get = vi.fn();
    put = vi.fn();
    post = vi.fn();
    deleteFn = vi.fn();
    TestBed.configureTestingModule({
      providers: [VrindayaStoryAdminService, { provide: HttpClient, useValue: { get, put, post, delete: deleteFn } }],
    });
    svc = TestBed.inject(VrindayaStoryAdminService);
  });

  it('fetches the story configuration from the API', async () => {
    const config: VrindayaStoryConfig = {
      items: [{ storyId: 'story-1', storyNumber: '01', title: 'Rooted in heritage', description: 'd', imageUrl: 'u', imageAlt: 'a', imagePosition: 'center', displayOrder: 1, isActive: true, storagePath: 'p', createdAt: '', updatedAt: '' }],
      createdAt: '',
      updatedAt: '',
      updatedBy: 'admin@vrindaya.in',
    };
    get.mockReturnValue(of(config));

    await expect(svc.getConfig()).resolves.toEqual(config);
    expect(get).toHaveBeenCalledWith(URL);
  });

  it('returns null when the configuration has never been saved', async () => {
    get.mockReturnValue(throwError(() => new Error('404')));

    await expect(svc.getConfig()).resolves.toBeNull();
  });

  it('saves the full configuration with PUT', async () => {
    const payload: VrindayaStorySavePayload = {
      items: [{ storyId: 'story-1', storyNumber: '01', title: 'Rooted in heritage', description: 'd', imageUrl: 'u', imageAlt: 'a', imagePosition: 'center', displayOrder: 1, isActive: true, storagePath: 'p' }],
    };
    put.mockReturnValue(of({ ...payload, createdAt: '', updatedAt: '', updatedBy: 'admin@vrindaya.in' }));

    await svc.save(payload);

    expect(put).toHaveBeenCalledWith(URL, payload);
  });

  it('uploads a story image as multipart form data', async () => {
    const uploaded: VrindayaStoryUploadedImage = { url: 'https://res.cloudinary.com/x.jpg', storagePath: 'vrindaya-story/items/abc', width: 1600, height: 2000, sizeBytes: 1024 };
    post.mockReturnValue(of(uploaded));
    const file = new File([new Uint8Array([1, 2, 3])], 'story.webp', { type: 'image/webp' });

    await expect(svc.uploadImage(file)).resolves.toEqual(uploaded);

    const [url, body] = post.mock.calls[0] as [string, FormData];
    expect(url).toBe(`${URL}/items/images`);
    expect(body.get('file')).toBe(file);
  });

  it('deletes a story image by storage path', async () => {
    deleteFn.mockReturnValue(of(null));

    await svc.deleteImage('vrindaya-story/items/abc');

    expect(deleteFn).toHaveBeenCalledWith(`${URL}/items/images`, { params: { storagePath: 'vrindaya-story/items/abc' } });
  });
});

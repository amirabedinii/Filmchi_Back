import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { TmdbService } from './tmdb.service';

describe('TmdbService', () => {
  let service: TmdbService;
  const httpMock = { request: jest.fn() } as any as HttpService;
  const cfgMock = {
    get: (k: string) => {
      if (k === 'TMDB_BEARER_TOKEN') return 'bearer123';
      if (k === 'TMDB_API_KEY') return 'apikey';
      return undefined;
    },
  } as any as ConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TmdbService,
        { provide: HttpService, useValue: httpMock },
        { provide: ConfigService, useValue: cfgMock },
      ],
    }).compile();

    service = moduleRef.get(TmdbService);
    jest.clearAllMocks();
  });

  it('uses bearer header when token present', async () => {
    (httpMock.request as any).mockReturnValueOnce(of({ data: { ok: true } }));
    const data = await service.get('/movie/1');
    expect(data).toEqual({ ok: true });
    const call = (httpMock.request as jest.Mock).mock.calls[0][0];
    expect(call.headers.Authorization).toMatch(/^Bearer\s/);
    expect(call.url).toMatch(/\/movie\/1$/);
  });

  it('falls back to api_key when no bearer', async () => {
    const cfg = cfgMock as any;
    jest.spyOn(cfg, 'get').mockImplementation((k: string) => {
      if (k === 'TMDB_BEARER_TOKEN') return '';
      if (k === 'TMDB_API_KEY') return 'apikey';
      return undefined;
    });
    (httpMock.request as any).mockReturnValueOnce(of({ data: { ok: true } }));
    const data = await service.get('/search/movie', { query: 'X' });
    expect(data).toEqual({ ok: true });
    const call = (httpMock.request as jest.Mock).mock.calls[0][0];
    expect(call.url).toMatch(/api_key=apikey/);
  });
});



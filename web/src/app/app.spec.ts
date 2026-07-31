import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { SwUpdate } from '@angular/service-worker';

import { App } from './app';

@Component({ standalone: true, template: '' })
class ShellHost {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([{ path: '**', component: ShellHost }]),
        provideLocationMocks(),
        provideHttpClient(),
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: false,
            versionUpdates: { subscribe: () => () => undefined },
            unrecoverable: { subscribe: () => () => undefined },
            checkForUpdate: () => Promise.resolve(),
            activateUpdate: () => Promise.resolve(),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the app shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-route-loading-bar')).not.toBeNull();
    expect(fixture.componentInstance.appReady()).toBe(false);
  });
});

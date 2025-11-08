import { bootstrapApplication } from "@angular/platform-browser";
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { provideAnimations } from "@angular/platform-browser/animations";
import { ConfirmationService, MessageService } from "primeng/api";

import { AppComponent } from "./app/app";
import { routes } from "./app/app.routes";
import { AuthGuard } from "./app/guards/auth-guard";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    provideAnimationsAsync(),
    ConfirmationService,
    MessageService,
    AuthGuard,
  ],
}).catch((err) => console.error(err));

import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 't',
  pure: false,   // re-evaluate when language signal changes
  standalone: true,
})
export class TranslatePipe implements PipeTransform {
  private lang = inject(LanguageService);

  transform(key: string): string {
    return this.lang.t(key);
  }
}

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ellipsis',
  standalone: true,
})
export class EllipsisPipe implements PipeTransform {
  transform(value: string, max: number = 250): string {
    // Check if the text needs to be truncated
    if (value.length > max) {
      return value.substring(0, max) + '...';
    }

    return value;
  }
}

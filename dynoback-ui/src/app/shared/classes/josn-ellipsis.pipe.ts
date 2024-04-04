import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'jsonEllipsis',
  standalone: true,
})
export class JsonEllipsisPipe implements PipeTransform {
  transform(value: any, max: number = 250): string {
    // Check if the text needs to be truncated
    const val = JSON.stringify(value);
    if (val.length > max) {
      return val.substring(0, max) + '...';
    }

    return val;
  }
}

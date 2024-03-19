import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileColumnComponent } from './file-column.component';

describe('FileColumnComponent', () => {
  let component: FileColumnComponent;
  let fixture: ComponentFixture<FileColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileColumnComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FileColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

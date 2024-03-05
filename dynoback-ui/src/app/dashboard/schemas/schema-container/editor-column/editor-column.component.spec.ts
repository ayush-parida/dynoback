import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorColumnComponent } from './editor-column.component';

describe('EditorColumnComponent', () => {
  let component: EditorColumnComponent;
  let fixture: ComponentFixture<EditorColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorColumnComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditorColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

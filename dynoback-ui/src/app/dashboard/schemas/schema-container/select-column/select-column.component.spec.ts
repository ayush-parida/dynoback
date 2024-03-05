import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectColumnComponent } from './select-column.component';

describe('SelectColumnComponent', () => {
  let component: SelectColumnComponent;
  let fixture: ComponentFixture<SelectColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectColumnComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelectColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

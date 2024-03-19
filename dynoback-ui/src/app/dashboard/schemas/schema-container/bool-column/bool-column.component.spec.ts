import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoolColumnComponent } from './bool-column.component';

describe('BoolColumnComponent', () => {
  let component: BoolColumnComponent;
  let fixture: ComponentFixture<BoolColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoolColumnComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BoolColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

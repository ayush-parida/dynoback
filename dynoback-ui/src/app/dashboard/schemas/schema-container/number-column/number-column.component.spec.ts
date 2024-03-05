import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumberColumnComponent } from './number-column.component';

describe('NumberColumnComponent', () => {
  let component: NumberColumnComponent;
  let fixture: ComponentFixture<NumberColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberColumnComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NumberColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

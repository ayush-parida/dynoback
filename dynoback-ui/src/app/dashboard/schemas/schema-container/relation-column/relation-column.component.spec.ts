import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelationColumnComponent } from './relation-column.component';

describe('RelationColumnComponent', () => {
  let component: RelationColumnComponent;
  let fixture: ComponentFixture<RelationColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationColumnComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RelationColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

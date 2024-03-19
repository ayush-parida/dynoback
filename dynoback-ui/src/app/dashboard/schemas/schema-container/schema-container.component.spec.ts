import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchemaContainerComponent } from './schema-container.component';

describe('SchemaContainerComponent', () => {
  let component: SchemaContainerComponent;
  let fixture: ComponentFixture<SchemaContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchemaContainerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SchemaContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchemaDataComponent } from './schema-data.component';

describe('SchemaDataComponent', () => {
  let component: SchemaDataComponent;
  let fixture: ComponentFixture<SchemaDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchemaDataComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SchemaDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

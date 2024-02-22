import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatabaseDetailsComponent } from './database-details.component';

describe('DatabaseDetailsComponent', () => {
  let component: DatabaseDetailsComponent;
  let fixture: ComponentFixture<DatabaseDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatabaseDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DatabaseDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

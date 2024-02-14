import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatabasesContainerComponent } from './databases-container.component';

describe('DatabasesContainerComponent', () => {
  let component: DatabasesContainerComponent;
  let fixture: ComponentFixture<DatabasesContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatabasesContainerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DatabasesContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailColumnComponent } from './email-column.component';

describe('EmailColumnComponent', () => {
  let component: EmailColumnComponent;
  let fixture: ComponentFixture<EmailColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailColumnComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmailColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

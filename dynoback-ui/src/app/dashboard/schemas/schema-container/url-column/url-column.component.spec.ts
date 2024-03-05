import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UrlColumnComponent } from './url-column.component';

describe('UrlColumnComponent', () => {
  let component: UrlColumnComponent;
  let fixture: ComponentFixture<UrlColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrlColumnComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UrlColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

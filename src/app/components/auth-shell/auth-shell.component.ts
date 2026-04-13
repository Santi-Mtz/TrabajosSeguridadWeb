import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CardModule],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.css'
})
export class AuthShellComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) subtitle = '';
  @Input() heroAltText = 'Autenticación';
  @Input() imageSrc = 'https://primefaces.org/cdn/primeng/images/card-ng.jpg';
  @Input() cardWidth = '42rem';
  @Input() contentWidth = '560px';
  @Input() heroHeight = '220px';
  @Output() heroImageClick = new EventEmitter<void>();

  onHeroImageClick(): void {
    this.heroImageClick.emit();
  }
}

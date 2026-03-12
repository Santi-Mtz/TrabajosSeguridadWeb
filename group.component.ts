import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CardModule],
  templateUrl: './group.component.html',
  styleUrl: './group.component.css'
})
export class GroupComponent {
  total = 'N';

  advance = {
    title: 'Card',
    description: 'Advance information'
  };
}

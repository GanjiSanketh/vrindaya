import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-vrindaya-look',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './vrindaya-look.html',
  styleUrl: './vrindaya-look.css',
})
export class VrindayaLook {
  readonly items = inject(ProductService).lookItems;
}

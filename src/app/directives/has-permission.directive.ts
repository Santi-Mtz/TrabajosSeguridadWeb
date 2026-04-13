import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionService } from '../services/permission.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private requiredPermission = '';
  private viewVisible = false;

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly permissionService: PermissionService
  ) {}

  @Input()
  set appHasPermission(permission: string) {
    this.requiredPermission = permission;
    this.updateView();
  }

  private updateView(): void {
    const canRender = this.permissionService.hasPermission(this.requiredPermission);

    if (canRender && !this.viewVisible) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.viewVisible = true;
      return;
    }

    if (!canRender && this.viewVisible) {
      this.viewContainer.clear();
      this.viewVisible = false;
    }
  }
}

import { Component, OnInit, ViewChild, ElementRef, afterNextRender, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';


// PrimeNG
import { ConfirmationService, MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';

// Components
import { NavbarComponent } from '../../shared/navbar/NavbarComponent';

// Services & Interfaces
import { IGroup } from '../EcommerceInterface';
import { GroupsService } from '../services/GroupsService';
import { GenresService } from '../services/GenresService';

@Component({
    selector: 'app-listgroups',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        DialogModule,
        ConfirmDialogModule,
        FileUploadModule,
        TooltipModule,
        MessageModule,
        DropdownModule,
        TableModule
    ],
    templateUrl: './ListgroupsComponent.html',
    providers: [ConfirmationService, MessageService]
})
export class ListgroupsComponent implements OnInit {
  @ViewChild(NavbarComponent, { static: false }) navbar!: NavbarComponent;
  @ViewChild('form') form!: NgForm;
  @ViewChild('fileInput') fileInput!: ElementRef;
  visibleError = false;
  errorMessage = '';
  groups: IGroup[] = [];
  filteredGroups: IGroup[] = [];
  visibleConfirm = false;
  imageGroup = '';
  visiblePhoto = false;
  photo = '';
  searchText: string = '';

  group: IGroup = {
    IdGroup: 0,
    NameGroup: '',
    ImageGroup: null,
    Photo: null,
    MusicGenreId: 0,
    NameMusicGenre: '',
    MusicGenre: '',
  };

  genres: any[] = [];
  records: any[] = [];

  @ViewChild('groupsContainer') groupsContainer!: ElementRef<HTMLDivElement>;
  private resizeObserver!: ResizeObserver;
  // Services injected using inject()
  private destroyRef = inject(DestroyRef);
  private groupsService = inject(GroupsService);
  private genresService = inject(GenresService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Runs once after initial rendering
    afterNextRender(() => {
      this.initializeGroupsGrid();
      this.setupResizeObserver();
      this.updateGridVisuals();
    });
  }

  ngOnInit(): void {
    this.getGroups();
    this.getGenres();
  }

  getGroups() {
    this.groupsService.getGroups().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (groups: IGroup[]) => {
        this.visibleError = false;
        this.groups = groups;
        this.filteredGroups = [...this.groups];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error in getGroups:', err);
        console.error('Status:', err.status);
        console.error('Error message:', err.message);
        console.error('Complete error:', JSON.stringify(err, null, 2));
        
        this.visibleError = true;
        this.controlError(err);
      },
    });
  }

  getGenres() {
    this.genresService.getGenres().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        this.genres = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.visibleError = true;
        this.controlError(err);
      },
    });
  }

  controlError(err: any) {
    if (err.error && typeof err.error === 'object' && err.error.message) {
      this.errorMessage = err.error.message;
    } else if (typeof err.error === 'string') {
      this.errorMessage = err.error;
    } else {
      this.errorMessage = 'An unexpected error has occurred';
    }
  }

  filterGroups() {
    if (!Array.isArray(this.groups)) {
      this.groups = [];
    }
    this.filteredGroups = this.groups.filter((group) =>
      group?.NameGroup?.toLowerCase()?.includes(this.searchText?.toLowerCase() ?? '')
    );
  }

  onSearchChange() {
    this.filterGroups();
  }

  showImage(group: IGroup) {
    if (this.visiblePhoto && this.group === group) {
      this.visiblePhoto = false;
    } else {
      this.group = group;
      this.photo = group.ImageGroup!;
      this.visiblePhoto = true;
    }
  }

  private initializeGroupsGrid(): void {
    // Setting up custom events for group cards
    const groupCards = document.querySelectorAll('.group-card');
    groupCards.forEach(card => {
      // Adding hover effect
      card.addEventListener('mouseenter', () => {
        card.classList.add('hovered');
      });
      card.addEventListener('mouseleave', () => {
        card.classList.remove('hovered');
      });
      
      // Setting up click handler for the card
      card.addEventListener('click', (event) => {
        // Avoid navigation when clicking buttons or links
        if (!(event.target as HTMLElement).closest('button') && 
            !(event.target as HTMLElement).closest('a')) {
          const groupId = card.getAttribute('data-group-id');
          if (groupId) {
            this.loadRecords(groupId);
          }
        }
      });
    });
  }

  private setupResizeObserver(): void {
    if (!this.groupsContainer) return;
    
    this.resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        this.adjustGridLayout();
      });
    });
    
    this.resizeObserver.observe(this.groupsContainer.nativeElement);
  }

  private adjustGridLayout(): void {
    if (!this.groupsContainer) return;
    
    const container = this.groupsContainer.nativeElement;
    const containerWidth = container.offsetWidth;
    const groupCards = container.querySelectorAll('.group-card');
    
    // Calculate the number of columns based on the container width
    let columns = 1;
    if (containerWidth >= 1200) {
      columns = 4;
    } else if (containerWidth >= 900) {
      columns = 3;
    } else if (containerWidth >= 600) {
      columns = 2;
    }
    
    // Apply the number of columns
    container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    
    // Adjust card styles
    groupCards.forEach(card => {
      if (containerWidth < 600) {
        card.classList.add('mobile-view');
      } else {
        card.classList.remove('mobile-view');
      }
    });
  }

  private updateGridVisuals(): void {
    if (!this.groupsContainer) return;
    
    const groupCards = this.groupsContainer.nativeElement.querySelectorAll('.group-card');
    
    groupCards.forEach((card, index) => {
      // Alternating card styles
      if (index % 2 === 0) {
        card.classList.add('even');
        card.classList.remove('odd');
      } else {
        card.classList.add('odd');
        card.classList.remove('even');
      }
      
      // Highlight groups without an image
      const image = card.querySelector('.group-image');
      if (image && !(image as HTMLImageElement).src) {
        card.classList.add('no-image');
      } else {
        card.classList.remove('no-image');
      }
    });
  }
  
  loadRecords(idGroup: string): void {
    this.router.navigate(['/listrecords', idGroup]);
  }

  ngOnDestroy(): void {
    // Clean up the ResizeObserver when the component is destroyed
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}

import { Component, OnInit } from '@angular/core';
import {Router,ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  constructor(private router:Router,private route:ActivatedRoute) { }

  shouldRun=true;
  opened=true;
  ngOnInit() {
    console.log('currentUser: '+localStorage.getItem('currentUser'));
    if(localStorage.getItem('currentUser')==null){
      console.log('navigating to splash');
      this.router.navigate(['target'], { relativeTo: this.route })
    }
  }

  navButton(){
    console.log('Button clicked');
    if(this.opened){
      this.opened=false;
    }else{
      this.opened=true;
    }
  }
}

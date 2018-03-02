import { RouterModule, Routes } from '@angular/router';
import { SplashComponent } from './splash/splash.component';
import { ModuleWithProviders } from '@angular/core';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes:Routes=[
    {
        path:'',
        redirectTo:'/splash',
        pathMatch:'full'
    },
    {path:'splash',component:SplashComponent},
    {path:'dashboard',component:DashboardComponent},
    {
        path:'**',
        redirectTo:'/splash',
        pathMatch:'full'
    }
];

export const routing:ModuleWithProviders=RouterModule.forRoot(routes);
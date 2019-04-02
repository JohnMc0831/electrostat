import { HomeComponent } from './components/home/home.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PreferencesComponent } from './components/preferences/preferences.component';

const routes: Routes = [
    {
        path: 'preferences',
        component: PreferencesComponent
    },
    {
        path: '',
        component: HomeComponent
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true, enableTracing: true})],
    exports: [RouterModule]
})
export class AppRoutingModule { }

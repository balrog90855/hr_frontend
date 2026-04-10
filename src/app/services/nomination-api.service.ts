import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Nomination, NominationSubmission } from '../models/nomination.model';

interface BackendNomination {
  id: number;
  nominatorName: string;
  nominatorTeam: string;
  nomineeEmployeeId: string;
  nomineeName: string;
  nominationText: string;
  createdAt: string;
}

function fromBackend(r: BackendNomination): Nomination {
  return {
    id: r.id,
    nominatorName: r.nominatorName,
    nominatorTeam: r.nominatorTeam,
    nomineeEmployeeId: r.nomineeEmployeeId,
    nomineeName: r.nomineeName,
    nominationText: r.nominationText,
    createdAt: r.createdAt,
  };
}

@Injectable({ providedIn: 'root' })
export class NominationApiService {
  private readonly url = `${environment.apiBaseUrl}/nominations`;

  constructor(private readonly http: HttpClient) {}

  submitNomination(data: NominationSubmission): Observable<Nomination> {
    const body = {
      nominatorName: data.nominatorName,
      nominatorTeam: data.nominatorTeam,
      nomineeEmployeeId: data.nomineeEmployeeId,
      nominationText: data.nominationText,
    };
    return this.http.post<BackendNomination>(this.url, body).pipe(map(fromBackend));
  }

  listNominations(): Observable<Nomination[]> {
    return this.http.get<BackendNomination[]>(this.url).pipe(
      map((rows) => rows.map(fromBackend))
    );
  }
}

<?php

namespace App\Http\Controllers;

use App\Clinic;
use App\Dosage;
use App\DosageFrequency;
use App\DosagePeriod;
use App\Drug;
use App\Patient;
use App\Prescription;
use App\PrescriptionDrug;
use App\User;
use Illuminate\Http\Request;

use App\Http\Requests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class APIController extends Controller
{
    /**
     * Get the clinic's drugs
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDrugs()
    {
        $clinic = Clinic::getCurrentClinic();
        $data = $clinic->drugs()->orderBy('name')->select('id', 'name', 'quantity')->get()->toArray();
        return response()->json($data);
    }


    /**
     * Get the Dosages, Frequencies and Periods of the clinic
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDosages()
    {
        $clinic = Clinic::getCurrentClinic();
        $dosages = $clinic->dosages()->orderBy('description')->select('id', 'description')->get()->toArray();
        $frequencies = $clinic->dosageFrequencies()->orderBy('description')->select('id', 'description')->get()->toArray();
        $periods = $clinic->dosagePeriods()->orderBy('description')->select('id', 'description')->get()->toArray();

        return response()->json(['dosages' => $dosages, 'frequencies' => $frequencies, 'periods' => $periods]);
    }


    /**
     * Saves a prescription
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function savePrescription(Request $request)
    {
        Log::info($request->all());
        $patient = Patient::find($request->id);
        if (empty($patient) || Gate::denies('prescribeMedicine', $patient)) {
            return response()->json(['status' => 0], 404);
        }

        DB::beginTransaction();
        try {
            $prescription = new Prescription();
            $prescription->complaints = $request->complaints;
            $prescription->investigations = $request->investigations;
            $prescription->diagnosis = $request->diagnosis;
            $prescription->remarks = $request->remarks;
            $prescription->creator()->associate(User::getCurrentUser());
            $prescription->patient()->associate($patient);
            $prescription->save();

            //save the prescribed drugs
            foreach ($request->prescribedDrugs as $prescribedDrug) {
                $drug = new PrescriptionDrug();
                $drug->dosage()->associate(Dosage::find($prescribedDrug['dose']['id']));
                $drug->frequency()->associate(DosageFrequency::find($prescribedDrug['frequency']['id']));
                $drug->period()->associate(DosagePeriod::find($prescribedDrug['period']['id']));
                $drug->drug()->associate(Drug::find($prescribedDrug['drug']['id']));
                $prescription->prescriptionDrugs()->save($drug);
            }

        } catch (\Exception $e) {
            Log::info($e->getMessage());
            DB::rollback();
            return response()->json(['status' => 0], 500);
        }
        DB::commit();
        return response()->json(['status' => 1], 200);
    }
}

package com.paisabudget.dto;

import com.paisabudget.entity.DailyEntry;
import java.time.LocalDate;

public class DailyEntryRequest {

    private String description;
    private Double amount;
    private String note;
    private DailyEntry.EntryType entryType = DailyEntry.EntryType.EXPENSE;
    private LocalDate entryDate;

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public DailyEntry.EntryType getEntryType() { return entryType; }
    public void setEntryType(DailyEntry.EntryType entryType) { this.entryType = entryType; }

    public LocalDate getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDate entryDate) { this.entryDate = entryDate; }
}

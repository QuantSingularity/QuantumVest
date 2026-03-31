import logging

import joblib
import numpy as np
from data_preprocessing import SEQUENCE_LENGTH, preprocess_data
from sklearn.model_selection import train_test_split
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.models import Sequential
from tensorflow.keras.optimizers import Adam

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

DATA_PATH = "../../../../resources/datasets/market_data.csv"
MODEL_PATH = "../../prediction_model.pkl"


def build_lstm_model(input_shape: tuple) -> Sequential:
    model = Sequential()
    model.add(
        LSTM(
            units=128,
            return_sequences=True,
            input_shape=input_shape,
            recurrent_dropout=0.2,
        )
    )
    model.add(Dropout(0.3))

    model.add(LSTM(units=64, return_sequences=False, recurrent_dropout=0.2))
    model.add(Dropout(0.3))

    model.add(Dense(units=1))

    optimizer = Adam(learning_rate=0.001)
    model.compile(optimizer=optimizer, loss="mean_squared_error", metrics=["mae"])
    return model


def train_prediction_model(
    data_path: str = DATA_PATH,
    model_path: str = MODEL_PATH,
    sequence_length: int = SEQUENCE_LENGTH,
    epochs: int = 50,
    batch_size: int = 32,
    validation_split: float = 0.2,
) -> None:
    logger.info(f"Starting prediction model training with data from: {data_path}")

    X, y, scaler = preprocess_data(data_path, sequence_length=sequence_length)

    if X.size == 0:
        logger.error("Data preprocessing failed. Cannot train model.")
        return

    X = np.reshape(X, (X.shape[0], X.shape[1], X.shape[2]))

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=validation_split, shuffle=False
    )

    logger.info(f"Training set size: {len(X_train)}")
    logger.info(f"Validation set size: {len(X_val)}")

    model = build_lstm_model(input_shape=(X_train.shape[1], X_train.shape[2]))
    model.summary(print_fn=logger.info)

    callbacks_list = [
        EarlyStopping(
            monitor="val_loss", patience=10, restore_best_weights=True, verbose=1
        ),
        ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6, verbose=1
        ),
    ]

    history = model.fit(
        X_train,
        y_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_data=(X_val, y_val),
        callbacks=callbacks_list,
        verbose=2,
    )

    loss, mae = model.evaluate(X_val, y_val, verbose=0)
    logger.info(f"Validation Loss: {loss:.4f}, MAE: {mae:.4f}")

    joblib.dump(
        {"model": model, "scaler": scaler, "history": history.history}, model_path
    )
    logger.info(f"Trained model and scaler saved to {model_path}")


if __name__ == "__main__":
    logger.info(
        "Script executed. To run a full training, ensure data is available at the specified path."
    )

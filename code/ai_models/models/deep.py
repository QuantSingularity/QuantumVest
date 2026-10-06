import os

_custom_layers_ready = False
_PositionalEmbedding = None


def import_tensorflow():
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
    import tensorflow as tf
    from tensorflow import keras

    global _custom_layers_ready, _PositionalEmbedding
    if not _custom_layers_ready:

        @keras.saving.register_keras_serializable(package="quantumvest")
        class PositionalEmbedding(keras.layers.Layer):
            def __init__(self, sequence_length: int, dim: int, **kwargs) -> None:
                super().__init__(**kwargs)
                self.sequence_length = int(sequence_length)
                self.dim = int(dim)
                self.embedding = keras.layers.Embedding(self.sequence_length, self.dim)

            def call(self, inputs):
                positions = tf.range(self.sequence_length)
                return inputs + self.embedding(positions)

            def get_config(self):
                config = super().get_config()
                config.update(
                    {"sequence_length": self.sequence_length, "dim": self.dim}
                )
                return config

        _PositionalEmbedding = PositionalEmbedding
        _custom_layers_ready = True
    return tf, keras


def build_lstm(seq_len: int, n_features: int):
    _, keras = import_tensorflow()
    layers = keras.layers
    inputs = keras.Input(shape=(seq_len, n_features))
    x = layers.LSTM(64, return_sequences=True)(inputs)
    x = layers.Dropout(0.2)(x)
    x = layers.LSTM(32)(x)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(16, activation="relu")(x)
    outputs = layers.Dense(1)(x)
    model = keras.Model(inputs, outputs)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3, clipnorm=1.0),
        loss=keras.losses.Huber(),
    )
    return model


def build_transformer(seq_len: int, n_features: int):
    _, keras = import_tensorflow()
    layers = keras.layers
    dim = 32
    inputs = keras.Input(shape=(seq_len, n_features))
    x = layers.Dense(dim)(inputs)
    x = _PositionalEmbedding(seq_len, dim)(x)
    attn = layers.MultiHeadAttention(num_heads=4, key_dim=8, dropout=0.1)(x, x)
    x = layers.LayerNormalization(epsilon=1e-6)(x + attn)
    ffn = layers.Dense(64, activation="relu")(x)
    ffn = layers.Dropout(0.1)(ffn)
    ffn = layers.Dense(dim)(ffn)
    x = layers.LayerNormalization(epsilon=1e-6)(x + ffn)
    x = layers.GlobalAveragePooling1D()(x)
    x = layers.Dense(16, activation="relu")(x)
    outputs = layers.Dense(1)(x)
    model = keras.Model(inputs, outputs)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3, clipnorm=1.0),
        loss=keras.losses.Huber(),
    )
    return model
